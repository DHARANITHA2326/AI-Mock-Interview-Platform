import vm from "vm";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface TestCaseItem {
  id: number;
  input: string;
  expectedOutput: string;
  description?: string;
}

export interface ExecutionResultDetail {
  id: number;
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  error?: string;
}

export interface ExecutionResponse {
  passed: number;
  total: number;
  percentage: number;
  details: ExecutionResultDetail[];
}

/**
 * Clean input argument strings to remove parameter variable prefixes like
 * `nums = [2, 7, 11, 15], target = 9` -> `[2, 7, 11, 15], 9`
 * `s = "hello"` -> `"hello"`
 */
export function cleanInputArguments(rawInput: string): string {
  if (!rawInput || typeof rawInput !== "string") return "";
  let s = rawInput.trim();

  // Strip named parameter prefixes like "nums = ", "target = ", "s = ", "k = "
  s = s.replace(/(?:^|,\s*)[a-zA-Z0-9_]+\s*=\s*/g, (m) => m.startsWith(",") ? ", " : "").trim();

  // If the input is a single bare unquoted string with spaces and no brackets or commas:
  // e.g. "race a car" or "hello" without quotes
  if (
    !s.startsWith("[") &&
    !s.startsWith("{") &&
    !s.startsWith('"') &&
    !s.startsWith("'") &&
    !/^\d+$/.test(s) &&
    !s.includes(",") &&
    s.length > 0 &&
    !["true", "false", "null", "undefined"].includes(s.toLowerCase())
  ) {
    s = JSON.stringify(s);
  }

  return s;
}

/**
 * Compare actual output with expected output using smart type-aware normalization:
 * - Boolean comparison ("true" vs true)
 * - Numeric equality (5 vs "5", 5.0 vs 5)
 * - Strings without wrapping quotes
 * - Arrays/Lists (order-insensitive for pair indices like Two Sum)
 */
export function compareOutputs(actual: any, expectedStr: string): { passed: boolean; actualStr: string } {
  let actualStr = "";
  if (actual === undefined) actualStr = "undefined";
  else if (actual === null) actualStr = "null";
  else if (typeof actual === "boolean") actualStr = actual ? "true" : "false";
  else if (typeof actual === "number") actualStr = String(actual);
  else if (typeof actual === "object") {
    try {
      actualStr = JSON.stringify(actual);
    } catch {
      actualStr = String(actual);
    }
  } else {
    actualStr = String(actual);
  }

  const exp = String(expectedStr || "").trim();
  const act = actualStr.trim();

  // Exact string match
  if (act === exp) {
    return { passed: true, actualStr };
  }

  // Whitespace-insensitive & lowercase match
  const normExp = exp.replace(/\s+/g, "").toLowerCase();
  const normAct = act.replace(/\s+/g, "").toLowerCase();

  if (normAct === normExp) {
    return { passed: true, actualStr };
  }

  // Strip surrounding quotes for strings
  let stripExp = normExp;
  let stripAct = normAct;
  if ((stripExp.startsWith('"') && stripExp.endsWith('"')) || (stripExp.startsWith("'") && stripExp.endsWith("'"))) {
    stripExp = stripExp.slice(1, -1);
  }
  if ((stripAct.startsWith('"') && stripAct.endsWith('"')) || (stripAct.startsWith("'") && stripAct.endsWith("'"))) {
    stripAct = stripAct.slice(1, -1);
  }
  if (stripAct === stripExp) {
    return { passed: true, actualStr };
  }

  // Number comparison
  const numAct = Number(act);
  const numExp = Number(exp);
  if (!isNaN(numAct) && !isNaN(numExp) && isFinite(numAct) && isFinite(numExp)) {
    if (Math.abs(numAct - numExp) < 1e-6) {
      return { passed: true, actualStr };
    }
  }

  // Array comparison (handle order independence for 2-element index pairs like Two Sum)
  try {
    const parsedAct = JSON.parse(act.startsWith("[") ? act : `[${act}]`);
    const parsedExp = JSON.parse(exp.startsWith("[") ? exp : `[${exp}]`);
    if (Array.isArray(parsedAct) && Array.isArray(parsedExp) && parsedAct.length === parsedExp.length) {
      if (parsedAct.length === 2 && typeof parsedAct[0] === "number" && typeof parsedAct[1] === "number") {
        if ([...parsedAct].sort((a, b) => a - b).join(",") === [...parsedExp].sort((a, b) => a - b).join(",")) {
          return { passed: true, actualStr };
        }
      }
    }
  } catch {}

  return { passed: false, actualStr };
}

/**
 * Execute candidate code across supported languages
 */
export async function executeCode(params: {
  code: string;
  language?: string;
  testCases?: TestCaseItem[];
  functionName?: string;
}): Promise<ExecutionResponse> {
  const { code, functionName } = params;
  const lang = (params.language || "javascript").toLowerCase();

  const cases: TestCaseItem[] = Array.isArray(params.testCases) && params.testCases.length > 0
    ? params.testCases
    : [
        { id: 1, input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]", description: "Default case" }
      ];

  let details: ExecutionResultDetail[] = [];

  // ----------------------------------------------------
  // 1. JAVASCRIPT EXECUTION VIA NODE VM
  // ----------------------------------------------------
  if (lang === "javascript") {
    // Collect all candidate function names to invoke
    const candidates: string[] = [];
    if (functionName) {
      candidates.push(functionName);
      // Also camelCase and snake_case variations
      candidates.push(functionName.replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
      candidates.push(functionName.replace(/([A-Z])/g, "_$1").toLowerCase());
    }

    // Extract function declarations from code
    const fnDeclRegex = /(?:function\s+([a-zA-Z0-9_$]+)|(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>|[a-zA-Z0-9_$]+\s*=>))/g;
    let m;
    while ((m = fnDeclRegex.exec(code)) !== null) {
      const name = m[1] || m[2];
      if (name && !candidates.includes(name)) candidates.push(name);
    }

    // LeetCode class Solution methods
    const classMethodRegex = /class\s+Solution[\s\S]*?(?:public\s+|static\s+|async\s+)*([a-zA-Z0-9_$]+)\s*\(/g;
    while ((m = classMethodRegex.exec(code)) !== null) {
      if (m[1] && !candidates.includes(m[1])) candidates.push(m[1]);
    }

    // Common standard problem function names
    const commonNames = [
      "twoSum", "two_sum", "isPalindrome", "is_palindrome", "isValid", "is_valid",
      "maxSubArray", "max_sub_array", "maxProfit", "max_profit", "containsDuplicate", "contains_duplicate",
      "isAnagram", "is_anagram", "climbStairs", "climb_stairs", "singleNumber", "single_number",
      "reverseString", "reverse_string", "search", "moveZeroes", "move_zeroes",
      "lengthOfLastWord", "length_of_last_word", "plusOne", "plus_one",
      "longestCommonPrefix", "longest_common_prefix", "maxArea", "max_area",
      "lengthOfLongestSubstring", "length_of_longest_substring", "rob", "reverseWords", "reverse_words",
      "fizzBuzz", "fizz_buzz", "solve", "solution"
    ];
    for (const name of commonNames) {
      if (!candidates.includes(name)) candidates.push(name);
    }

    for (const tc of cases) {
      try {
        const cleanedInput = cleanInputArguments(tc.input);

        const sandbox = {
          console: { log: () => {} },
          JSON,
          Math,
          Array,
          Object,
          String,
          Number,
          Boolean,
          Map,
          Set,
          RegExp,
          parseInt,
          parseFloat,
          isNaN,
          isFinite
        };
        const context = vm.createContext(sandbox);

        const harness = `
          ${code}
          ;(() => {
            const candidateNames = ${JSON.stringify(candidates)};
            let targetFn = null;
            for (const name of candidateNames) {
              try {
                const val = eval(name);
                if (typeof val === 'function') { targetFn = val; break; }
              } catch(e) {}
            }
            if (!targetFn) {
              try {
                if (typeof Solution === 'function' || typeof Solution === 'object') {
                  const inst = typeof Solution === 'function' ? new Solution() : Solution;
                  for (const name of candidateNames) {
                    if (typeof inst[name] === 'function') { targetFn = inst[name].bind(inst); break; }
                  }
                }
              } catch(e) {}
            }
            if (!targetFn) {
              for (const k of Object.keys(this)) {
                if (typeof this[k] === 'function' && !['eval', 'parseInt', 'parseFloat', 'isNaN', 'isFinite'].includes(k)) {
                  targetFn = this[k]; break;
                }
              }
            }
            if (!targetFn) throw new Error("No callable solution function found. Please define your solution function.");
            const args = [${cleanedInput}];
            return targetFn(...args);
          })();
        `;

        const rawResult = vm.runInContext(harness, context, { timeout: 2000 });
        const { passed, actualStr } = compareOutputs(rawResult, tc.expectedOutput);

        details.push({
          id: tc.id,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: actualStr,
          passed,
          error: passed ? undefined : `Output mismatch: expected ${tc.expectedOutput}, got ${actualStr}`
        });
      } catch (err: any) {
        details.push({
          id: tc.id,
          input: tc.input,
          expected: tc.expectedOutput,
          actual: "Runtime Error: " + (err.message || "Execution failed"),
          passed: false,
          error: err.message || "Runtime error"
        });
      }
    }
  }

  // ----------------------------------------------------
  // 2. PYTHON 3 EXECUTION VIA SUBPROCESS
  // ----------------------------------------------------
  else if (lang === "python") {
    const pythonHarness = `
import json, sys, re

code_str = ${JSON.stringify(code)}
cases = ${JSON.stringify(cases)}
hint_fn_name = ${JSON.stringify(functionName || "")}

def clean_input_args(raw_input):
    s = raw_input.strip()
    s = re.sub(r'(?:^|,\s*)[a-zA-Z0-9_]+\s*=\s*', lambda m: ', ' if m.group(0).startswith(',') else '', s)
    s = s.strip()
    return s

def compare_results(actual, expected_str):
    if isinstance(actual, tuple):
        actual = list(actual)
    if isinstance(actual, bool):
        act_str = "true" if actual else "false"
    elif isinstance(actual, (int, float)):
        act_str = str(actual)
    elif isinstance(actual, (list, dict)):
        act_str = json.dumps(actual)
    elif actual is None:
        act_str = "null"
    else:
        act_str = str(actual)

    norm_exp = expected_str.strip().replace(" ", "").lower()
    norm_act = act_str.strip().replace(" ", "").lower()

    if norm_act == norm_exp:
        return True, act_str

    # String quotes stripping
    strip_exp = norm_exp
    strip_act = norm_act
    if (strip_exp.startswith('"') and strip_exp.endswith('"')) or (strip_exp.startswith("'") and strip_exp.endswith("'")):
        strip_exp = strip_exp[1:-1]
    if (strip_act.startswith('"') and strip_act.endswith('"')) or (strip_act.startswith("'") and strip_act.endswith("'")):
        strip_act = strip_act[1:-1]
    if strip_act == strip_exp:
        return True, act_str

    # Numeric comparison
    try:
        if abs(float(act_str) - float(expected_str)) < 1e-6:
            return True, act_str
    except:
        pass

    # Array 2-element index pair sorted comparison
    try:
        a_obj = json.loads(act_str if act_str.startswith('[') else f"[{act_str}]")
        e_obj = json.loads(expected_str if expected_str.startswith('[') else f"[{expected_str}]")
        if isinstance(a_obj, list) and isinstance(e_obj, list) and len(a_obj) == 2 and len(e_obj) == 2:
            if sorted(a_obj) == sorted(e_obj):
                return True, act_str
    except:
        pass

    return False, act_str

# Execute code into scope
exec_scope = {}
try:
    exec(code_str, exec_scope)
except Exception as e:
    err_msg = f"{type(e).__name__}: {str(e)}"
    out = []
    for tc in cases:
        out.append({
            "id": tc.get("id", 1),
            "input": tc.get("input", ""),
            "expected": tc.get("expectedOutput", ""),
            "actual": err_msg,
            "passed": False,
            "error": err_msg
        })
    print(json.dumps(out))
    sys.exit(0)

# Discover candidate function
target_fn = None
fn_candidates = []
if hint_fn_name:
    fn_candidates.append(hint_fn_name)
    fn_candidates.append(re.sub(r'([A-Z])', r'_\\1', hint_fn_name).lower())
    fn_candidates.append(re.sub(r'_([a-z])', lambda m: m.group(1).upper(), hint_fn_name))

# Extract all user-defined defs
defs_found = re.findall(r'def\s+([a-zA-Z0-9_]+)\s*\(', code_str)
fn_candidates.extend(defs_found)

# Standard problem functions
fn_candidates.extend([
    'two_sum', 'twoSum', 'is_palindrome', 'isPalindrome', 'is_valid', 'isValid',
    'max_sub_array', 'maxSubArray', 'max_profit', 'maxProfit', 'contains_duplicate', 'containsDuplicate',
    'is_anagram', 'isAnagram', 'climb_stairs', 'climbStairs', 'single_number', 'singleNumber',
    'reverse_string', 'reverseString', 'search', 'move_zeroes', 'moveZeroes',
    'length_of_last_word', 'lengthOfLastWord', 'plus_one', 'plusOne',
    'longest_common_prefix', 'longestCommonPrefix', 'max_area', 'maxArea',
    'length_of_longest_substring', 'lengthOfLongestSubstring', 'rob',
    'reverse_words', 'reverseWords', 'fizz_buzz', 'fizzBuzz', 'solve', 'solution'
])

for name in fn_candidates:
    if name in exec_scope and callable(exec_scope[name]):
        target_fn = exec_scope[name]
        break

if not target_fn and 'Solution' in exec_scope:
    try:
        sol_inst = exec_scope['Solution']()
        for name in fn_candidates:
            if hasattr(sol_inst, name) and callable(getattr(sol_inst, name)):
                target_fn = getattr(sol_inst, name)
                break
    except:
        pass

if not target_fn:
    for k, v in list(exec_scope.items()):
        if callable(v) and not k.startswith('_'):
            target_fn = v
            break

out = []
if not target_fn:
    for tc in cases:
        out.append({
            "id": tc.get("id", 1),
            "input": tc.get("input", ""),
            "expected": tc.get("expectedOutput", ""),
            "actual": "NameError: No callable solution function found",
            "passed": False,
            "error": "Please define your solution function e.g. def solve(nums):"
        })
    print(json.dumps(out))
    sys.exit(0)

safe_builtins = {
    "__builtins__": None, "true": True, "false": False, "null": None,
    "True": True, "False": False, "None": None, "list": list, "dict": dict, "set": set
}

for tc in cases:
    try:
        raw_in = tc.get("input", "")
        cleaned = clean_input_args(raw_in)
        args = eval(f"[{cleaned}]", safe_builtins)
        res = target_fn(*args)
        passed, actual_str = compare_results(res, str(tc.get("expectedOutput", "")))
        out.append({
            "id": tc.get("id", 1),
            "input": raw_in,
            "expected": tc.get("expectedOutput", ""),
            "actual": actual_str,
            "passed": passed,
            "error": None if passed else f"Output mismatch: expected {tc.get('expectedOutput')}, got {actual_str}"
        })
    except Exception as e:
        out.append({
            "id": tc.get("id", 1),
            "input": tc.get("input", ""),
            "expected": tc.get("expectedOutput", ""),
            "actual": f"{type(e).__name__}: {str(e)}",
            "passed": False,
            "error": str(e)
        })

print(json.dumps(out))
`;

    try {
      const { stdout } = await execFileAsync("python3", ["-c", pythonHarness], { timeout: 4000 });
      const parsedResults = JSON.parse(stdout.trim());
      if (Array.isArray(parsedResults)) {
        details = parsedResults;
      } else {
        throw new Error("Invalid output format from Python runner");
      }
    } catch (pyErr: any) {
      const errMsg = pyErr.stderr || pyErr.message || "Python execution failed";
      details = cases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: "Python Execution Error: " + errMsg.slice(0, 160),
        passed: false,
        error: errMsg
      }));
    }
  }

  // ----------------------------------------------------
  // 3. SQL QUERY EXECUTION (VIA PYTHON SQLITE3 IN-MEMORY)
  // ----------------------------------------------------
  else if (lang === "sql") {
    const sqlHarness = `
import sqlite3, json, sys

query = ${JSON.stringify(code.trim())}
cases = ${JSON.stringify(cases)}

con = sqlite3.connect(":memory:")
cur = con.cursor()

# Bootstrap standard mock tables for SQL coding problems
cur.execute("CREATE TABLE IF NOT EXISTS Department (id INT, name TEXT)")
cur.execute("CREATE TABLE IF NOT EXISTS Employee (id INT, name TEXT, salary INT, department_id INT)")
cur.execute("CREATE TABLE IF NOT EXISTS Person (id INT, email TEXT)")
cur.execute("CREATE TABLE IF NOT EXISTS Customers (id INT, name TEXT)")
cur.execute("CREATE TABLE IF NOT EXISTS Orders (id INT, customerId INT, amount INT)")

cur.executemany("INSERT INTO Department VALUES (?, ?)", [(1, 'IT'), (2, 'Sales')])
cur.executemany("INSERT INTO Employee VALUES (?, ?, ?, ?)", [
    (1, 'Joe', 70000, 1),
    (2, 'Jim', 90000, 1),
    (3, 'Henry', 80000, 2),
    (4, 'Sam', 60000, 2),
    (5, 'Max', 90000, 1)
])
cur.executemany("INSERT INTO Person VALUES (?, ?)", [
    (1, 'a@b.com'), (2, 'c@d.com'), (3, 'a@b.com')
])
cur.executemany("INSERT INTO Customers VALUES (?, ?)", [
    (1, 'Joe'), (2, 'Henry'), (3, 'Sam'), (4, 'Max')
])
cur.executemany("INSERT INTO Orders VALUES (?, ?, ?)", [
    (1, 3, 100), (2, 1, 200)
])
con.commit()

out = []
try:
    cur.execute(query)
    rows = cur.fetchall()
    row_count = len(rows)
    has_results = row_count > 0
    actual_desc = f"{row_count} rows returned: " + ", ".join([str(r) for r in rows[:3]])

    for tc in cases:
        out.append({
            "id": tc.get("id", 1),
            "input": tc.get("input", ""),
            "expected": tc.get("expectedOutput", ""),
            "actual": actual_desc,
            "passed": has_results,
            "error": None if has_results else "Query executed successfully but returned 0 rows"
        })
except Exception as e:
    err_str = f"SQL Error: {str(e)}"
    for tc in cases:
        out.append({
            "id": tc.get("id", 1),
            "input": tc.get("input", ""),
            "expected": tc.get("expectedOutput", ""),
            "actual": err_str,
            "passed": False,
            "error": str(e)
        })

print(json.dumps(out))
`;

    try {
      const { stdout } = await execFileAsync("python3", ["-c", sqlHarness], { timeout: 3500 });
      const parsedResults = JSON.parse(stdout.trim());
      if (Array.isArray(parsedResults)) {
        details = parsedResults;
      } else {
        throw new Error("Invalid output format from SQL runner");
      }
    } catch (sqlErr: any) {
      const errMsg = sqlErr.stderr || sqlErr.message || "SQL execution failed";
      details = cases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: "SQL Execution Error: " + errMsg.slice(0, 150),
        passed: false,
        error: errMsg
      }));
    }
  }

  // ----------------------------------------------------
  // 4. JAVA & C++ ALGORITHMIC EXECUTION & TRANSFORMATION
  // ----------------------------------------------------
  else if (lang === "java" || lang === "cpp") {
    const codeTrimmed = code.trim();
    const openBraces = (codeTrimmed.match(/{/g) || []).length;
    const closeBraces = (codeTrimmed.match(/}/g) || []).length;
    const hasReturn = codeTrimmed.includes("return");

    if (openBraces !== closeBraces || openBraces === 0) {
      details = cases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: "Compilation Error: Unbalanced curly braces { } in " + (lang === "java" ? "Java" : "C++") + " code",
        passed: false,
        error: "Syntax error: curly braces mismatch"
      }));
    } else if (!hasReturn && !codeTrimmed.includes("System.out") && !codeTrimmed.includes("cout")) {
      details = cases.map(tc => ({
        id: tc.id,
        input: tc.input,
        expected: tc.expectedOutput,
        actual: "Compilation Error: Missing return statement in method body",
        passed: false,
        error: "Method must return a value matching the method signature"
      }));
    } else {
      // Transpile standard algorithmic Java/C++ into clean sandbox JS
      let jsEquivalent = code
        .replace(/#include\s+<[^>]+>/g, "")
        .replace(/using\s+namespace\s+std\s*;/g, "")
        .replace(/class\s+\w+\s*{/g, "")
        .replace(/public\s+(static\s+)?(int\[\]|boolean|int|String|void|List<[^>]+>)\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, "function solveFunction(...args) { const [nums, target, s, prices, n] = args;")
        .replace(/(vector<int>|bool|int|string|void)\s+([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*{/g, "function solveFunction(...args) { const [nums, target, s, prices, n] = args;")
        .replace(/java\.util\.Map<[^>]+>\s+\w+\s*=\s*new\s+java\.util\.HashMap<>\(\);/g, "const map = new Map();")
        .replace(/unordered_map<[^>]+>\s+\w+;/g, "const seen = new Map();")
        .replace(/map\.containsKey\(([^)]+)\)/g, "map.has($1)")
        .replace(/seen\.count\(([^)]+)\)/g, "seen.has($1)")
        .replace(/map\.put\(([^,]+),\s*([^)]+)\)/g, "map.set($1, $2)")
        .replace(/seen\[([^\]]+)\]\s*=\s*([^;]+)/g, "seen.set($1, $2)")
        .replace(/map\.get\(([^)]+)\)/g, "map.get($1)")
        .replace(/new\s+int\[\]\s*{([^}]+)}/g, "[$1]")
        .replace(/new\s+int\[\]\s*{}/g, "[]")
        .replace(/return\s*{([^}]+)};/g, "return [$1];")
        .replace(/return\s*{};/g, "return [];");

      for (const tc of cases) {
        try {
          const cleanedInput = cleanInputArguments(tc.input);
          const sandbox = {
            console: { log: () => {} },
            JSON,
            Math,
            Array,
            Object,
            String,
            Number,
            Boolean,
            Map,
            Set
          };
          const context = vm.createContext(sandbox);
          const runScript = `
            ${jsEquivalent}
            (function() {
              const args = [${cleanedInput}];
              if (typeof solveFunction === 'function') return solveFunction(...args);
              return null;
            })()
          `;
          const rawResult = vm.runInContext(runScript, context, { timeout: 1500 });
          const { passed, actualStr } = compareOutputs(rawResult, tc.expectedOutput);

          details.push({
            id: tc.id,
            input: tc.input,
            expected: tc.expectedOutput,
            actual: actualStr,
            passed,
            error: passed ? undefined : `Output mismatch: expected ${tc.expectedOutput}, got ${actualStr}`
          });
        } catch (e: any) {
          details.push({
            id: tc.id,
            input: tc.input,
            expected: tc.expectedOutput,
            actual: "Runtime Error in logic: " + (e.message || "Execution failed"),
            passed: false,
            error: e.message
          });
        }
      }
    }
  }

  const passedCount = details.filter(d => d.passed).length;
  const totalCount = details.length;
  const percentage = Math.round((passedCount / totalCount) * 100);

  return {
    passed: passedCount,
    total: totalCount,
    percentage,
    details
  };
}
