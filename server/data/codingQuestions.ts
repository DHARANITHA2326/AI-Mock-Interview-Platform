export interface CodingQuestion {
  id: string;
  text: string;
  type: "Coding";
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;
  subject?: string;
  functionName: string;
  codingTemplate: string;
  starterTemplates: {
    javascript: string;
    python: string;
    java: string;
    cpp: string;
    sql?: string;
  };
  expectedOutput: string;
  testCases: Array<{
    id: number;
    input: string;
    expectedOutput: string;
    description: string;
  }>;
}

export const CODING_QUESTIONS_BANK: CodingQuestion[] = [
  {
    id: "code-two-sum",
    text: "Two Sum Target Pair: Given an array of integers `nums` and an integer `target`, return the 0-based indices of the two numbers such that they add up to `target`. You may assume each input has exactly one solution.",
    type: "Coding",
    difficulty: "Easy",
    category: "Arrays & Hash Table",
    functionName: "twoSum",
    codingTemplate: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
    starterTemplates: {
      javascript: `function twoSum(nums, target) {\n  // Write your solution here\n  // Return indices [i, j] of elements summing to target\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const comp = target - nums[i];\n    if (map.has(comp)) return [map.get(comp), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
      python: `def two_sum(nums, target):\n    # Write your solution here\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n    return []`,
      java: `class Solution {\n    public static int[] twoSum(int[] nums, int target) {\n        java.util.Map<Integer, Integer> map = new java.util.HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int comp = target - nums[i];\n            if (map.containsKey(comp)) return new int[]{map.get(comp), i};\n            map.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
      cpp: `#include <vector>\n#include <unordered_map>\nusing namespace std;\n\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> seen;\n    for (int i = 0; i < nums.size(); i++) {\n        int complement = target - nums[i];\n        if (seen.count(complement)) return {seen[complement], i};\n        seen[nums[i]] = i;\n    }\n    return {};\n}`
    },
    expectedOutput: "[0, 1]",
    testCases: [
      { id: 1, input: "[2, 7, 11, 15], 9", expectedOutput: "[0, 1]", description: "Sample standard pair" },
      { id: 2, input: "[3, 2, 4], 6", expectedOutput: "[1, 2]", description: "Indices out of sequential order" },
      { id: 3, input: "[3, 3], 6", expectedOutput: "[0, 1]", description: "Identical elements" },
      { id: 4, input: "[1, 5, 8, 3], 11", expectedOutput: "[2, 3]", description: "Pair at end of array" }
    ]
  },
  {
    id: "code-palindrome",
    text: "Valid Palindrome: A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Write a function `isPalindrome(s)` that returns true if valid, false otherwise.",
    type: "Coding",
    difficulty: "Easy",
    category: "Strings & Two Pointers",
    functionName: "isPalindrome",
    codingTemplate: `function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}`,
    starterTemplates: {
      javascript: `function isPalindrome(s) {\n  // Clean string and verify forward equals backward\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}`,
      python: `def is_palindrome(s):\n    # Return True if palindrome, False otherwise\n    clean = [c.lower() for c in s if c.isalnum()]\n    return clean == clean[::-1]`,
      java: `class Solution {\n    public static boolean isPalindrome(String s) {\n        String clean = s.replaceAll("[^a-zA-Z0-9]", "").toLowerCase();\n        return clean.equals(new StringBuilder(clean).reverse().toString());\n    }\n}`,
      cpp: `#include <string>\n#include <algorithm>\nusing namespace std;\n\nbool isPalindrome(string s) {\n    string clean = "";\n    for (char c : s) if (isalnum(c)) clean += tolower(c);\n    string rev = clean;\n    reverse(rev.begin(), rev.end());\n    return clean == rev;\n}`
    },
    expectedOutput: "true",
    testCases: [
      { id: 1, input: '"A man, a plan, a canal: Panama"', expectedOutput: "true", description: "Complex sentence palindrome" },
      { id: 2, input: '"race a car"', expectedOutput: "false", description: "Non-palindrome string" },
      { id: 3, input: '" "', expectedOutput: "true", description: "Empty string whitespace edge case" },
      { id: 4, input: '"Was it a car or a cat I saw?"', expectedOutput: "true", description: "Punctuation palindrome" }
    ]
  },
  {
    id: "code-valid-parentheses",
    text: "Valid Parentheses: Given a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid. Open brackets must be closed by the same type of brackets and in the correct order.",
    type: "Coding",
    difficulty: "Medium",
    category: "Stack & Parsing",
    functionName: "isValid",
    codingTemplate: `function isValid(s) {\n  const stack = [];\n  const pairs = { ')': '(', '}': '{', ']': '[' };\n  for (const c of s) {\n    if (c === '(' || c === '{' || c === '[') stack.push(c);\n    else if (stack.pop() !== pairs[c]) return false;\n  }\n  return stack.length === 0;\n}`,
    starterTemplates: {
      javascript: `function isValid(s) {\n  const stack = [];\n  const pairs = { ')': '(', '}': '{', ']': '[' };\n  for (const c of s) {\n    if (c === '(' || c === '{' || c === '[') stack.push(c);\n    else if (stack.pop() !== pairs[c]) return false;\n  }\n  return stack.length === 0;\n}`,
      python: `def is_valid(s):\n    stack = []\n    pairs = {')': '(', '}': '{', ']': '['}\n    for c in s:\n        if c in '({[':\n            stack.append(c)\n        else:\n            if not stack or stack.pop() != pairs.get(c):\n                return False\n    return len(stack) == 0`,
      java: `class Solution {\n    public static boolean isValid(String s) {\n        java.util.Stack<Character> stack = new java.util.Stack<>();\n        for (char c : s.toCharArray()) {\n            if (c == '(') stack.push(')');\n            else if (c == '{') stack.push('}');\n            else if (c == '[') stack.push(']');\n            else if (stack.isEmpty() || stack.pop() != c) return false;\n        }\n        return stack.isEmpty();\n    }\n}`,
      cpp: `#include <string>\n#include <stack>\nusing namespace std;\n\nbool isValid(string s) {\n    stack<char> st;\n    for (char c : s) {\n        if (c == '(' || c == '{' || c == '[') st.push(c);\n        else {\n            if (st.empty()) return false;\n            if (c == ')' && st.top() != '(') return false;\n            if (c == '}' && st.top() != '{') return false;\n            if (c == ']' && st.top() != '[') return false;\n            st.pop();\n        }\n    }\n    return st.empty();\n}`
    },
    expectedOutput: "true",
    testCases: [
      { id: 1, input: '"()"', expectedOutput: "true", description: "Simple balanced parentheses" },
      { id: 2, input: '"()[]{}"', expectedOutput: "true", description: "Consecutive multiple pairs" },
      { id: 3, input: '"(]"', expectedOutput: "false", description: "Mismatched closing bracket" },
      { id: 4, input: '"([{}])"', expectedOutput: "true", description: "Nested symmetric brackets" }
    ]
  },
  {
    id: "code-max-subarray",
    text: "Maximum Subarray Sum (Kadane's Algorithm): Given an integer array `nums`, find the subarray with the largest sum, and return its sum.",
    type: "Coding",
    difficulty: "Medium",
    category: "Dynamic Programming & Arrays",
    functionName: "maxSubArray",
    codingTemplate: `function maxSubArray(nums) {\n  let cur = nums[0], max = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    max = Math.max(max, cur);\n  }\n  return max;\n}`,
    starterTemplates: {
      javascript: `function maxSubArray(nums) {\n  let cur = nums[0], max = nums[0];\n  for (let i = 1; i < nums.length; i++) {\n    cur = Math.max(nums[i], cur + nums[i]);\n    max = Math.max(max, cur);\n  }\n  return max;\n}`,
      python: `def max_sub_array(nums):\n    cur = max_sum = nums[0]\n    for n in nums[1:]:\n        cur = max(n, cur + n)\n        max_sum = max(max_sum, cur)\n    return max_sum`,
      java: `class Solution {\n    public static int maxSubArray(int[] nums) {\n        int cur = nums[0], max = nums[0];\n        for (int i = 1; i < nums.length; i++) {\n            cur = Math.max(nums[i], cur + nums[i]);\n            max = Math.max(max, cur);\n        }\n        return max;\n    }\n}`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxSubArray(vector<int>& nums) {\n    int cur = nums[0], max_sum = nums[0];\n    for (size_t i = 1; i < nums.size(); ++i) {\n        cur = max(nums[i], cur + nums[i]);\n        max_sum = max(max_sum, cur);\n    }\n    return max_sum;\n}`
    },
    expectedOutput: "6",
    testCases: [
      { id: 1, input: "[-2, 1, -3, 4, -1, 2, 1, -5, 4]", expectedOutput: "6", description: "Subarray [4, -1, 2, 1] sum = 6" },
      { id: 2, input: "[1]", expectedOutput: "1", description: "Single element array" },
      { id: 3, input: "[5, 4, -1, 7, 8]", expectedOutput: "23", description: "All positive values" },
      { id: 4, input: "[-5, -2, -8, -1]", expectedOutput: "-1", description: "All negative numbers" }
    ]
  },
  {
    id: "code-stock-profit",
    text: "Best Time to Buy and Sell Stock: You are given an array `prices` where `prices[i]` is the price of a given stock on the i-th day. Return the maximum profit you can achieve from this transaction. If you cannot achieve any profit, return 0.",
    type: "Coding",
    difficulty: "Easy",
    category: "Greedy & Arrays",
    functionName: "maxProfit",
    codingTemplate: `function maxProfit(prices) {\n  let minPrice = Infinity, maxProfit = 0;\n  for (const price of prices) {\n    if (price < minPrice) minPrice = price;\n    else if (price - minPrice > maxProfit) maxProfit = price - minPrice;\n  }\n  return maxProfit;\n}`,
    starterTemplates: {
      javascript: `function maxProfit(prices) {\n  let minPrice = Infinity, maxProfit = 0;\n  for (const price of prices) {\n    if (price < minPrice) minPrice = price;\n    else if (price - minPrice > maxProfit) maxProfit = price - minPrice;\n  }\n  return maxProfit;\n}`,
      python: `def max_profit(prices):\n    min_price = float('inf')\n    max_profit = 0\n    for p in prices:\n        if p < min_price:\n            min_price = p\n        elif p - min_price > max_profit:\n            max_profit = p - min_price\n    return max_profit`,
      java: `class Solution {\n    public static int maxProfit(int[] prices) {\n        int minPrice = Integer.MAX_VALUE, maxProfit = 0;\n        for (int p : prices) {\n            if (p < minPrice) minPrice = p;\n            else if (p - minPrice > maxProfit) maxProfit = p - minPrice;\n        }\n        return maxProfit;\n    }\n}`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxProfit(vector<int>& prices) {\n    int min_price = 1e9, max_profit = 0;\n    for (int p : prices) {\n        if (p < min_price) min_price = p;\n        else max_profit = max(max_profit, p - min_price);\n    }\n    return max_profit;\n}`
    },
    expectedOutput: "5",
    testCases: [
      { id: 1, input: "[7, 1, 5, 3, 6, 4]", expectedOutput: "5", description: "Buy day 2 (price 1), sell day 5 (price 6), profit = 5" },
      { id: 2, input: "[7, 6, 4, 3, 1]", expectedOutput: "0", description: "Monotonically decreasing prices, profit = 0" },
      { id: 3, input: "[1, 2, 3, 4, 5]", expectedOutput: "4", description: "Monotonically increasing prices" },
      { id: 4, input: "[2, 4, 1]", expectedOutput: "2", description: "Dip at the end" }
    ]
  },
  {
    id: "code-contains-duplicate",
    text: "Contains Duplicate: Given an integer array `nums`, return `true` if any value appears at least twice in the array, and return `false` if every element is distinct.",
    type: "Coding",
    difficulty: "Easy",
    category: "Hash Set & Arrays",
    functionName: "containsDuplicate",
    codingTemplate: `function containsDuplicate(nums) {\n  return new Set(nums).size !== nums.length;\n}`,
    starterTemplates: {
      javascript: `function containsDuplicate(nums) {\n  return new Set(nums).size !== nums.length;\n}`,
      python: `def contains_duplicate(nums):\n    return len(set(nums)) != len(nums)`,
      java: `class Solution {\n    public static boolean containsDuplicate(int[] nums) {\n        java.util.Set<Integer> seen = new java.util.HashSet<>();\n        for (int n : nums) {\n            if (!seen.add(n)) return true;\n        }\n        return false;\n    }\n}`,
      cpp: `#include <vector>\n#include <unordered_set>\nusing namespace std;\n\nbool containsDuplicate(vector<int>& nums) {\n    unordered_set<int> seen;\n    for (int n : nums) {\n        if (seen.count(n)) return true;\n        seen.insert(n);\n    }\n    return false;\n}`
    },
    expectedOutput: "true",
    testCases: [
      { id: 1, input: "[1, 2, 3, 1]", expectedOutput: "true", description: "Contains duplicate element 1" },
      { id: 2, input: "[1, 2, 3, 4]", expectedOutput: "false", description: "All distinct elements" },
      { id: 3, input: "[1, 1, 1, 3, 3, 4, 3, 2, 4, 2]", expectedOutput: "true", description: "Multiple repeating numbers" },
      { id: 4, input: "[99]", expectedOutput: "false", description: "Single element array" }
    ]
  },
  {
    id: "code-valid-anagram",
    text: "Valid Anagram: Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise. An Anagram is a word or phrase formed by rearranging the letters of a different word or phrase.",
    type: "Coding",
    difficulty: "Easy",
    category: "Strings & Hash Map",
    functionName: "isAnagram",
    codingTemplate: `function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  return s.split('').sort().join('') === t.split('').sort().join('');\n}`,
    starterTemplates: {
      javascript: `function isAnagram(s, t) {\n  if (s.length !== t.length) return false;\n  return s.split('').sort().join('') === t.split('').sort().join('');\n}`,
      python: `def is_anagram(s, t):\n    if len(s) != len(t): return False\n    return sorted(s) == sorted(t)`,
      java: `class Solution {\n    public static boolean isAnagram(String s, String t) {\n        if (s.length() != t.length()) return false;\n        char[] a = s.toCharArray(), b = t.toCharArray();\n        java.util.Arrays.sort(a); java.util.Arrays.sort(b);\n        return java.util.Arrays.equals(a, b);\n    }\n}`,
      cpp: `#include <string>\n#include <algorithm>\nusing namespace std;\n\nbool isAnagram(string s, string t) {\n    if (s.length() != t.length()) return false;\n    sort(s.begin(), s.end());\n    sort(t.begin(), t.end());\n    return s == t;\n}`
    },
    expectedOutput: "true",
    testCases: [
      { id: 1, input: '"anagram", "nagaram"', expectedOutput: "true", description: "Standard valid anagram" },
      { id: 2, input: '"rat", "car"', expectedOutput: "false", description: "Different letters" },
      { id: 3, input: '"a", "a"', expectedOutput: "true", description: "Single identical character" },
      { id: 4, input: '"ab", "a"', expectedOutput: "false", description: "Different length strings" }
    ]
  },
  {
    id: "code-climbing-stairs",
    text: "Climbing Stairs: You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
    type: "Coding",
    difficulty: "Easy",
    category: "Dynamic Programming",
    functionName: "climbStairs",
    codingTemplate: `function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n}`,
    starterTemplates: {
      javascript: `function climbStairs(n) {\n  if (n <= 2) return n;\n  let a = 1, b = 2;\n  for (let i = 3; i <= n; i++) {\n    const temp = a + b;\n    a = b;\n    b = temp;\n  }\n  return b;\n}`,
      python: `def climb_stairs(n):\n    if n <= 2:\n        return n\n    a, b = 1, 2\n    for _ in range(3, n + 1):\n        a, b = b, a + b\n    return b`,
      java: `class Solution {\n    public static int climbStairs(int n) {\n        if (n <= 2) return n;\n        int a = 1, b = 2;\n        for (int i = 3; i <= n; i++) {\n            int temp = a + b;\n            a = b;\n            b = temp;\n        }\n        return b;\n    }\n}`,
      cpp: `int climbStairs(int n) {\n    if (n <= 2) return n;\n    int a = 1, b = 2;\n    for (int i = 3; i <= n; i++) {\n        int temp = a + b;\n        a = b;\n        b = temp;\n    }\n    return b;\n}`
    },
    expectedOutput: "3",
    testCases: [
      { id: 1, input: "2", expectedOutput: "2", description: "2 steps: (1+1) or (2)" },
      { id: 2, input: "3", expectedOutput: "3", description: "3 steps: (1+1+1), (1+2), (2+1)" },
      { id: 3, input: "4", expectedOutput: "5", description: "4 steps: 5 combinations" },
      { id: 4, input: "5", expectedOutput: "8", description: "5 steps: 8 combinations" }
    ]
  },
  {
    id: "code-single-number",
    text: "Single Number: Given a non-empty array of integers `nums`, every element appears twice except for one. Find that single one. Implement a solution with linear runtime O(n) and constant O(1) space.",
    type: "Coding",
    difficulty: "Easy",
    category: "Bit Manipulation & Arrays",
    functionName: "singleNumber",
    codingTemplate: `function singleNumber(nums) {\n  return nums.reduce((acc, curr) => acc ^ curr, 0);\n}`,
    starterTemplates: {
      javascript: `function singleNumber(nums) {\n  return nums.reduce((acc, curr) => acc ^ curr, 0);\n}`,
      python: `def single_number(nums):\n    res = 0\n    for n in nums:\n        res ^= n\n    return res`,
      java: `class Solution {\n    public static int singleNumber(int[] nums) {\n        int res = 0;\n        for (int n : nums) res ^= n;\n        return res;\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nint singleNumber(vector<int>& nums) {\n    int res = 0;\n    for (int n : nums) res ^= n;\n    return res;\n}`
    },
    expectedOutput: "1",
    testCases: [
      { id: 1, input: "[2, 2, 1]", expectedOutput: "1", description: "Single 1 among pairs of 2" },
      { id: 2, input: "[4, 1, 2, 1, 2]", expectedOutput: "4", description: "Single 4 among pairs of 1 and 2" },
      { id: 3, input: "[1]", expectedOutput: "1", description: "Single element" },
      { id: 4, input: "[7, 3, 5, 3, 7]", expectedOutput: "5", description: "Single 5 in array" }
    ]
  },
  {
    id: "code-reverse-string",
    text: "Reverse a String: Write a function `reverseString(s)` that reverses a string and returns the reversed string result.",
    type: "Coding",
    difficulty: "Easy",
    category: "Strings & Two Pointers",
    functionName: "reverseString",
    codingTemplate: `function reverseString(s) {\n  return s.split('').reverse().join('');\n}`,
    starterTemplates: {
      javascript: `function reverseString(s) {\n  return s.split('').reverse().join('');\n}`,
      python: `def reverse_string(s):\n    return s[::-1]`,
      java: `class Solution {\n    public static String reverseString(String s) {\n        return new StringBuilder(s).reverse().toString();\n    }\n}`,
      cpp: `#include <string>\n#include <algorithm>\nusing namespace std;\n\nstring reverseString(string s) {\n    reverse(s.begin(), s.end());\n    return s;\n}`
    },
    expectedOutput: '"olleh"',
    testCases: [
      { id: 1, input: '"hello"', expectedOutput: '"olleh"', description: "Reverse word hello" },
      { id: 2, input: '"Hannah"', expectedOutput: '"hannaH"', description: "Case sensitive reverse" },
      { id: 3, input: '"a"', expectedOutput: '"a"', description: "Single character" },
      { id: 4, input: '"Google"', expectedOutput: '"elgooG"', description: "Company name reverse" }
    ]
  },
  {
    id: "code-binary-search",
    text: "Binary Search: Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then return its 0-based index. Otherwise, return -1. Time complexity must be O(log n).",
    type: "Coding",
    difficulty: "Easy",
    category: "Binary Search",
    functionName: "search",
    codingTemplate: `function search(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
    starterTemplates: {
      javascript: `function search(nums, target) {\n  let left = 0, right = nums.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (nums[mid] === target) return mid;\n    if (nums[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}`,
      python: `def search(nums, target):\n    left, right = 0, len(nums) - 1\n    while left <= right:\n        mid = (left + right) // 2\n        if nums[mid] == target:\n            return mid\n        elif nums[mid] < target:\n            left = mid + 1\n        else:\n            right = mid - 1\n    return -1`,
      java: `class Solution {\n    public static int search(int[] nums, int target) {\n        int left = 0, right = nums.length - 1;\n        while (left <= right) {\n            int mid = left + (right - left) / 2;\n            if (nums[mid] == target) return mid;\n            if (nums[mid] < target) left = mid + 1;\n            else right = mid - 1;\n        }\n        return -1;\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nint search(vector<int>& nums, int target) {\n    int left = 0, right = nums.size() - 1;\n    while (left <= right) {\n        int mid = left + (right - left) / 2;\n        if (nums[mid] == target) return mid;\n        if (nums[mid] < target) left = mid + 1;\n        else right = mid - 1;\n    }\n    return -1;\n}`
    },
    expectedOutput: "4",
    testCases: [
      { id: 1, input: "[-1, 0, 3, 5, 9, 12], 9", expectedOutput: "4", description: "Target 9 exists at index 4" },
      { id: 2, input: "[-1, 0, 3, 5, 9, 12], 2", expectedOutput: "-1", description: "Target 2 does not exist, return -1" },
      { id: 3, input: "[5], 5", expectedOutput: "0", description: "Single element match" },
      { id: 4, input: "[2, 4, 6, 8, 10], 8", expectedOutput: "3", description: "Even length array search" }
    ]
  },
  {
    id: "code-move-zeroes",
    text: "Move Zeroes: Given an integer array `nums`, move all 0's to the end of it while maintaining the relative order of the non-zero elements. Return the modified array `nums`.",
    type: "Coding",
    difficulty: "Easy",
    category: "Two Pointers & Arrays",
    functionName: "moveZeroes",
    codingTemplate: `function moveZeroes(nums) {\n  let insertPos = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] !== 0) {\n      nums[insertPos++] = nums[i];\n    }\n  }\n  while (insertPos < nums.length) {\n    nums[insertPos++] = 0;\n  }\n  return nums;\n}`,
    starterTemplates: {
      javascript: `function moveZeroes(nums) {\n  let pos = 0;\n  for (let i = 0; i < nums.length; i++) {\n    if (nums[i] !== 0) nums[pos++] = nums[i];\n  }\n  while (pos < nums.length) nums[pos++] = 0;\n  return nums;\n}`,
      python: `def move_zeroes(nums):\n    pos = 0\n    for n in nums:\n        if n != 0:\n            nums[pos] = n\n            pos += 1\n    while pos < len(nums):\n        nums[pos] = 0\n        pos += 1\n    return nums`,
      java: `class Solution {\n    public static int[] moveZeroes(int[] nums) {\n        int pos = 0;\n        for (int n : nums) if (n != 0) nums[pos++] = n;\n        while (pos < nums.length) nums[pos++] = 0;\n        return nums;\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nvector<int> moveZeroes(vector<int>& nums) {\n    int pos = 0;\n    for (int n : nums) if (n != 0) nums[pos++] = n;\n    while (pos < nums.size()) nums[pos++] = 0;\n    return nums;\n}`
    },
    expectedOutput: "[1, 3, 12, 0, 0]",
    testCases: [
      { id: 1, input: "[0, 1, 0, 3, 12]", expectedOutput: "[1, 3, 12, 0, 0]", description: "Move zeroes to end maintaining non-zero order" },
      { id: 2, input: "[0]", expectedOutput: "[0]", description: "Single zero" },
      { id: 3, input: "[1, 2, 3]", expectedOutput: "[1, 2, 3]", description: "No zeroes present" },
      { id: 4, input: "[0, 0, 1]", expectedOutput: "[1, 0, 0]", description: "Multiple leading zeroes" }
    ]
  },
  {
    id: "code-length-last-word",
    text: "Length of Last Word: Given a string `s` consisting of words and spaces, return the length of the last word in the string. A word is a maximal substring consisting of non-space characters only.",
    type: "Coding",
    difficulty: "Easy",
    category: "Strings",
    functionName: "lengthOfLastWord",
    codingTemplate: `function lengthOfLastWord(s) {\n  const words = s.trim().split(/\\s+/);\n  return words.length > 0 ? words[words.length - 1].length : 0;\n}`,
    starterTemplates: {
      javascript: `function lengthOfLastWord(s) {\n  const words = s.trim().split(/\\s+/);\n  return words.length > 0 ? words[words.length - 1].length : 0;\n}`,
      python: `def length_of_last_word(s):\n    words = s.strip().split()\n    return len(words[-1]) if words else 0`,
      java: `class Solution {\n    public static int lengthOfLastWord(String s) {\n        String[] words = s.trim().split("\\\\s+");\n        return words.length > 0 ? words[words.length - 1].length() : 0;\n    }\n}`,
      cpp: `#include <string>\nusing namespace std;\n\nint lengthOfLastWord(string s) {\n    int len = 0, i = s.size() - 1;\n    while (i >= 0 && s[i] == ' ') i--;\n    while (i >= 0 && s[i] != ' ') { len++; i--; }\n    return len;\n}`
    },
    expectedOutput: "5",
    testCases: [
      { id: 1, input: '"Hello World"', expectedOutput: "5", description: "Standard two-word sentence" },
      { id: 2, input: '"   fly me   to   the moon  "', expectedOutput: "4", description: "Trailing and internal whitespace" },
      { id: 3, input: '"luffy is still joyboy"', expectedOutput: "6", description: "Word joyboy length 6" },
      { id: 4, input: '"a"', expectedOutput: "1", description: "Single letter" }
    ]
  },
  {
    id: "code-plus-one",
    text: "Plus One: You are given a large integer represented as an integer array `digits`, where each `digits[i]` is the ith digit of the integer. The digits are ordered from most significant to least significant in left-to-right order. Increment the large integer by one and return the resulting array of digits.",
    type: "Coding",
    difficulty: "Easy",
    category: "Math & Arrays",
    functionName: "plusOne",
    codingTemplate: `function plusOne(digits) {\n  for (let i = digits.length - 1; i >= 0; i--) {\n    if (digits[i] < 9) {\n      digits[i]++;\n      return digits;\n    }\n    digits[i] = 0;\n  }\n  return [1, ...digits];\n}`,
    starterTemplates: {
      javascript: `function plusOne(digits) {\n  for (let i = digits.length - 1; i >= 0; i--) {\n    if (digits[i] < 9) {\n      digits[i]++;\n      return digits;\n    }\n    digits[i] = 0;\n  }\n  return [1, ...digits];\n}`,
      python: `def plus_one(digits):\n    for i in range(len(digits) - 1, -1, -1):\n        if digits[i] < 9:\n            digits[i] += 1\n            return digits\n        digits[i] = 0\n    return [1] + digits`,
      java: `class Solution {\n    public static int[] plusOne(int[] digits) {\n        for (int i = digits.length - 1; i >= 0; i--) {\n            if (digits[i] < 9) {\n                digits[i]++;\n                return digits;\n            }\n            digits[i] = 0;\n        }\n        int[] res = new int[digits.length + 1];\n        res[0] = 1;\n        return res;\n    }\n}`,
      cpp: `#include <vector>\nusing namespace std;\n\nvector<int> plusOne(vector<int>& digits) {\n    for (int i = digits.size() - 1; i >= 0; i--) {\n        if (digits[i] < 9) {\n            digits[i]++;\n            return digits;\n        }\n        digits[i] = 0;\n    }\n    digits.insert(digits.begin(), 1);\n    return digits;\n}`
    },
    expectedOutput: "[1, 2, 4]",
    testCases: [
      { id: 1, input: "[1, 2, 3]", expectedOutput: "[1, 2, 4]", description: "123 + 1 = 124" },
      { id: 2, input: "[4, 3, 2, 1]", expectedOutput: "[4, 3, 2, 2]", description: "4321 + 1 = 4322" },
      { id: 3, input: "[9]", expectedOutput: "[1, 0]", description: "9 + 1 = 10 (overflow)" },
      { id: 4, input: "[9, 9, 9]", expectedOutput: "[1, 0, 0, 0]", description: "999 + 1 = 1000" }
    ]
  },
  {
    id: "code-longest-common-prefix",
    text: "Longest Common Prefix: Write a function `longestCommonPrefix(strs)` to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string \"\".",
    type: "Coding",
    difficulty: "Easy",
    category: "Strings",
    functionName: "longestCommonPrefix",
    codingTemplate: `function longestCommonPrefix(strs) {\n  if (!strs.length) return "";\n  let prefix = strs[0];\n  for (let i = 1; i < strs.length; i++) {\n    while (strs[i].indexOf(prefix) !== 0) {\n      prefix = prefix.substring(0, prefix.length - 1);\n      if (!prefix) return "";\n    }\n  }\n  return prefix;\n}`,
    starterTemplates: {
      javascript: `function longestCommonPrefix(strs) {\n  if (!strs.length) return "";\n  let prefix = strs[0];\n  for (let i = 1; i < strs.length; i++) {\n    while (strs[i].indexOf(prefix) !== 0) {\n      prefix = prefix.substring(0, prefix.length - 1);\n      if (!prefix) return "";\n    }\n  }\n  return prefix;\n}`,
      python: `def longest_common_prefix(strs):\n    if not strs: return ""\n    prefix = strs[0]\n    for s in strs[1:]:\n        while not s.startswith(prefix):\n            prefix = prefix[:-1]\n            if not prefix: return ""\n    return prefix`,
      java: `class Solution {\n    public static String longestCommonPrefix(String[] strs) {\n        if (strs.length == 0) return "";\n        String prefix = strs[0];\n        for (int i = 1; i < strs.length; i++) {\n            while (strs[i].indexOf(prefix) != 0) {\n                prefix = prefix.substring(0, prefix.length() - 1);\n                if (prefix.isEmpty()) return "";\n            }\n        }\n        return prefix;\n    }\n}`,
      cpp: `#include <vector>\n#include <string>\nusing namespace std;\n\nstring longestCommonPrefix(vector<string>& strs) {\n    if (strs.empty()) return "";\n    string prefix = strs[0];\n    for (size_t i = 1; i < strs.size(); i++) {\n        while (strs[i].find(prefix) != 0) {\n            prefix = prefix.substr(0, prefix.size() - 1);\n            if (prefix.empty()) return "";\n        }\n    }\n    return prefix;\n}`
    },
    expectedOutput: '"fl"',
    testCases: [
      { id: 1, input: '["flower", "flow", "flight"]', expectedOutput: '"fl"', description: "Common prefix fl" },
      { id: 2, input: '["dog", "racecar", "car"]', expectedOutput: '""', description: "No common prefix" },
      { id: 3, input: '["interview", "internet", "internal"]', expectedOutput: '"inter"', description: "Common prefix inter" },
      { id: 4, input: '["a"]', expectedOutput: '"a"', description: "Single string" }
    ]
  },
  {
    id: "code-container-water",
    text: "Container With Most Water: You are given an integer array `height` of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]). Find two lines that together with the x-axis form a container, such that the container contains the most water. Return the maximum amount of water a container can store.",
    type: "Coding",
    difficulty: "Medium",
    category: "Two Pointers & Greedy",
    functionName: "maxArea",
    codingTemplate: `function maxArea(height) {\n  let left = 0, right = height.length - 1, max = 0;\n  while (left < right) {\n    const h = Math.min(height[left], height[right]);\n    max = Math.max(max, h * (right - left));\n    if (height[left] < height[right]) left++;\n    else right--;\n  }\n  return max;\n}`,
    starterTemplates: {
      javascript: `function maxArea(height) {\n  let left = 0, right = height.length - 1, max = 0;\n  while (left < right) {\n    const h = Math.min(height[left], height[right]);\n    max = Math.max(max, h * (right - left));\n    if (height[left] < height[right]) left++;\n    else right--;\n  }\n  return max;\n}`,
      python: `def max_area(height):\n    left, right = 0, len(height) - 1\n    max_water = 0\n    while left < right:\n        h = min(height[left], height[right])\n        max_water = max(max_water, h * (right - left))\n        if height[left] < height[right]:\n            left += 1\n        else:\n            right -= 1\n    return max_water`,
      java: `class Solution {\n    public static int maxArea(int[] height) {\n        int left = 0, right = height.length - 1, max = 0;\n        while (left < right) {\n            int h = Math.min(height[left], height[right]);\n            max = Math.max(max, h * (right - left));\n            if (height[left] < height[right]) left++;\n            else right--;\n        }\n        return max;\n    }\n}`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint maxArea(vector<int>& height) {\n    int left = 0, right = height.size() - 1, max_val = 0;\n    while (left < right) {\n        int h = min(height[left], height[right]);\n        max_val = max(max_val, h * (right - left));\n        if (height[left] < height[right]) left++;\n        else right--;\n    }\n    return max_val;\n}`
    },
    expectedOutput: "49",
    testCases: [
      { id: 1, input: "[1, 8, 6, 2, 5, 4, 8, 3, 7]", expectedOutput: "49", description: "Lines at 1 and 8 hold 7 * 7 = 49 water" },
      { id: 2, input: "[1, 1]", expectedOutput: "1", description: "Two unit lines hold 1 unit" },
      { id: 3, input: "[4, 3, 2, 1, 4]", expectedOutput: "16", description: "Equal boundary lines 4 * 4 = 16" },
      { id: 4, input: "[1, 2, 1]", expectedOutput: "2", description: "Width 2 height 1 = 2" }
    ]
  },
  {
    id: "code-longest-substring",
    text: "Longest Substring Without Repeating Characters: Given a string `s`, find the length of the longest substring without repeating characters.",
    type: "Coding",
    difficulty: "Medium",
    category: "Sliding Window & Hash Map",
    functionName: "lengthOfLongestSubstring",
    codingTemplate: `function lengthOfLongestSubstring(s) {\n  let maxLen = 0, left = 0;\n  const map = new Map();\n  for (let right = 0; right < s.length; right++) {\n    if (map.has(s[right])) left = Math.max(map.get(s[right]) + 1, left);\n    map.set(s[right], right);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}`,
    starterTemplates: {
      javascript: `function lengthOfLongestSubstring(s) {\n  let maxLen = 0, left = 0;\n  const map = new Map();\n  for (let right = 0; right < s.length; right++) {\n    if (map.has(s[right])) left = Math.max(map.get(s[right]) + 1, left);\n    map.set(s[right], right);\n    maxLen = Math.max(maxLen, right - left + 1);\n  }\n  return maxLen;\n}`,
      python: `def length_of_longest_substring(s):\n    max_len = 0\n    left = 0\n    seen = {}\n    for right, char in enumerate(s):\n        if char in seen:\n            left = max(seen[char] + 1, left)\n        seen[char] = right\n        max_len = max(max_len, right - left + 1)\n    return max_len`,
      java: `class Solution {\n    public static int lengthOfLongestSubstring(String s) {\n        int maxLen = 0, left = 0;\n        java.util.Map<Character, Integer> map = new java.util.HashMap<>();\n        for (int right = 0; right < s.length(); right++) {\n            char c = s.charAt(right);\n            if (map.containsKey(c)) left = Math.max(map.get(c) + 1, left);\n            map.put(c, right);\n            maxLen = Math.max(maxLen, right - left + 1);\n        }\n        return maxLen;\n    }\n}`,
      cpp: `#include <string>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n    int max_len = 0, left = 0;\n    unordered_map<char, int> seen;\n    for (int right = 0; right < s.size(); right++) {\n        if (seen.count(s[right])) left = max(seen[s[right]] + 1, left);\n        seen[s[right]] = right;\n        max_len = max(max_len, right - left + 1);\n    }\n    return max_len;\n}`
    },
    expectedOutput: "3",
    testCases: [
      { id: 1, input: '"abcabcbb"', expectedOutput: "3", description: "Substring abc has length 3" },
      { id: 2, input: '"bbbbb"', expectedOutput: "1", description: "Substring b has length 1" },
      { id: 3, input: '"pwwkew"', expectedOutput: "3", description: "Substring wke has length 3" },
      { id: 4, input: '""', expectedOutput: "0", description: "Empty string length 0" }
    ]
  },
  {
    id: "code-house-robber",
    text: "House Robber: You are a professional robber planning to rob houses along a street. Each house has a certain amount of money stashed. Adjacent houses have security systems connected and will automatically contact the police if two adjacent houses were broken into on the same night. Return the maximum amount of money you can rob tonight without alerting the police.",
    type: "Coding",
    difficulty: "Medium",
    category: "Dynamic Programming",
    functionName: "rob",
    codingTemplate: `function rob(nums) {\n  let prev1 = 0, prev2 = 0;\n  for (const num of nums) {\n    const temp = Math.max(prev1, prev2 + num);\n    prev2 = prev1;\n    prev1 = temp;\n  }\n  return prev1;\n}`,
    starterTemplates: {
      javascript: `function rob(nums) {\n  let prev1 = 0, prev2 = 0;\n  for (const num of nums) {\n    const temp = Math.max(prev1, prev2 + num);\n    prev2 = prev1;\n    prev1 = temp;\n  }\n  return prev1;\n}`,
      python: `def rob(nums):\n    prev1 = prev2 = 0\n    for n in nums:\n        prev1, prev2 = max(prev1, prev2 + n), prev1\n    return prev1`,
      java: `class Solution {\n    public static int rob(int[] nums) {\n        int prev1 = 0, prev2 = 0;\n        for (int n : nums) {\n            int temp = Math.max(prev1, prev2 + n);\n            prev2 = prev1;\n            prev1 = temp;\n        }\n        return prev1;\n    }\n}`,
      cpp: `#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint rob(vector<int>& nums) {\n    int prev1 = 0, prev2 = 0;\n    for (int n : nums) {\n        int temp = max(prev1, prev2 + n);\n        prev2 = prev1;\n        prev1 = temp;\n    }\n    return prev1;\n}`
    },
    expectedOutput: "4",
    testCases: [
      { id: 1, input: "[1, 2, 3, 1]", expectedOutput: "4", description: "Rob house 1 (money = 1) and house 3 (money = 3), total = 4" },
      { id: 2, input: "[2, 7, 9, 3, 1]", expectedOutput: "12", description: "Rob house 1 (2), 3 (9), 5 (1), total = 12" },
      { id: 3, input: "[2, 1, 1, 2]", expectedOutput: "4", description: "Rob ends 2 + 2 = 4" },
      { id: 4, input: "[5]", expectedOutput: "5", description: "Single house" }
    ]
  },
  {
    id: "code-reverse-words",
    text: "Reverse Words in a String: Given an input string `s`, reverse the order of the words. A word is defined as a sequence of non-space characters. The words in `s` will be separated by at least one space. Return a string of the words in reverse order concatenated by a single space, without leading or trailing spaces.",
    type: "Coding",
    difficulty: "Medium",
    category: "Strings & Parsing",
    functionName: "reverseWords",
    codingTemplate: `function reverseWords(s) {\n  return s.trim().split(/\\s+/).reverse().join(' ');\n}`,
    starterTemplates: {
      javascript: `function reverseWords(s) {\n  return s.trim().split(/\\s+/).reverse().join(' ');\n}`,
      python: `def reverse_words(s):\n    return ' '.join(s.strip().split()[::-1])`,
      java: `class Solution {\n    public static String reverseWords(String s) {\n        String[] words = s.trim().split("\\\\s+");\n        StringBuilder sb = new StringBuilder();\n        for (int i = words.length - 1; i >= 0; i--) {\n            sb.append(words[i]);\n            if (i > 0) sb.append(" ");\n        }\n        return sb.toString();\n    }\n}`,
      cpp: `#include <string>\n#include <sstream>\n#include <vector>\nusing namespace std;\n\nstring reverseWords(string s) {\n    stringstream ss(s);\n    string word, res = "";\n    vector<string> words;\n    while (ss >> word) words.push_back(word);\n    for (int i = words.size() - 1; i >= 0; i--) {\n        res += words[i];\n        if (i > 0) res += " ";\n    }\n    return res;\n}`
    },
    expectedOutput: '"blue is sky the"',
    testCases: [
      { id: 1, input: '"the sky is blue"', expectedOutput: '"blue is sky the"', description: "Reverse word sequence" },
      { id: 2, input: '"  hello world  "', expectedOutput: '"world hello"', description: "Strip multiple spaces" },
      { id: 3, input: '"a good   example"', expectedOutput: '"example good a"', description: "Internal spaces reduction" },
      { id: 4, input: '"Alice"', expectedOutput: '"Alice"', description: "Single word" }
    ]
  },
  {
    id: "code-fizzbuzz",
    text: "FizzBuzz: Given an integer `n`, return a string array `answer` (1-indexed) where: answer[i] == \"FizzBuzz\" if i is divisible by 3 and 5, answer[i] == \"Fizz\" if i is divisible by 3, answer[i] == \"Buzz\" if i is divisible by 5, and answer[i] == i (as a string) if none of the above conditions are true.",
    type: "Coding",
    difficulty: "Easy",
    category: "Math & Strings",
    functionName: "fizzBuzz",
    codingTemplate: `function fizzBuzz(n) {\n  const res = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) res.push("FizzBuzz");\n    else if (i % 3 === 0) res.push("Fizz");\n    else if (i % 5 === 0) res.push("Buzz");\n    else res.push(String(i));\n  }\n  return res;\n}`,
    starterTemplates: {
      javascript: `function fizzBuzz(n) {\n  const res = [];\n  for (let i = 1; i <= n; i++) {\n    if (i % 15 === 0) res.push("FizzBuzz");\n    else if (i % 3 === 0) res.push("Fizz");\n    else if (i % 5 === 0) res.push("Buzz");\n    else res.push(String(i));\n  }\n  return res;\n}`,
      python: `def fizz_buzz(n):\n    res = []\n    for i in range(1, n + 1):\n        if i % 15 == 0:\n            res.append("FizzBuzz")\n        elif i % 3 == 0:\n            res.append("Fizz")\n        elif i % 5 == 0:\n            res.append("Buzz")\n        else:\n            res.append(str(i))\n    return res`,
      java: `class Solution {\n    public static java.util.List<String> fizzBuzz(int n) {\n        java.util.List<String> res = new java.util.ArrayList<>();\n        for (int i = 1; i <= n; i++) {\n            if (i % 15 == 0) res.add("FizzBuzz");\n            else if (i % 3 == 0) res.add("Fizz");\n            else if (i % 5 == 0) res.add("Buzz");\n            else res.add(String.valueOf(i));\n        }\n        return res;\n    }\n}`,
      cpp: `#include <vector>\n#include <string>\nusing namespace std;\n\nvector<string> fizzBuzz(int n) {\n    vector<string> res;\n    for (int i = 1; i <= n; i++) {\n        if (i % 15 == 0) res.push_back("FizzBuzz");\n        else if (i % 3 == 0) res.push_back("Fizz");\n        else if (i % 5 == 0) res.push_back("Buzz");\n        else res.push_back(to_string(i));\n    }\n    return res;\n}`
    },
    expectedOutput: '["1", "2", "Fizz"]',
    testCases: [
      { id: 1, input: "3", expectedOutput: '["1", "2", "Fizz"]', description: "Up to 3" },
      { id: 2, input: "5", expectedOutput: '["1", "2", "Fizz", "4", "Buzz"]', description: "Up to 5" },
      { id: 3, input: "15", expectedOutput: '["1", "2", "Fizz", "4", "Buzz", "Fizz", "7", "8", "Fizz", "Buzz", "11", "Fizz", "13", "14", "FizzBuzz"]', description: "Up to 15" },
      { id: 4, input: "1", expectedOutput: '["1"]', description: "Single 1" }
    ]
  },
  {
    id: "code-sql-highest-salary",
    text: "SQL Query: Department Highest Salary: Write an SQL query to find employees who have the highest salary in each of the departments. Return department name as Department, employee name as Employee, and salary as Salary.",
    type: "Coding",
    difficulty: "Medium",
    category: "SQL Queries & Aggregations",
    subject: "SQL",
    functionName: "departmentHighestSalary",
    codingTemplate: `SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary\nFROM Employee e\nJOIN Department d ON e.department_id = d.id\nWHERE (e.department_id, e.salary) IN (\n  SELECT department_id, MAX(salary)\n  FROM Employee\n  GROUP BY department_id\n);`,
    starterTemplates: {
      sql: `SELECT d.name AS Department, e.name AS Employee, e.salary AS Salary\nFROM Employee e\nJOIN Department d ON e.department_id = d.id\nWHERE (e.department_id, e.salary) IN (\n  SELECT department_id, MAX(salary)\n  FROM Employee\n  GROUP BY department_id\n);`,
      javascript: `// SQL Query solution`,
      python: `# SQL Query solution`,
      java: `// SQL Query solution`,
      cpp: `// SQL Query solution`
    },
    expectedOutput: "3 rows returned: IT: Max/Jim (90000), Sales: Henry (80000)",
    testCases: [
      { id: 1, input: "Employee table across IT and Sales", expectedOutput: "Valid Department, Employee, Salary result set", description: "Select maximum salary per department" },
      { id: 2, input: "Single employee department", expectedOutput: "Single row", description: "Department with one employee" },
      { id: 3, input: "Tie for highest salary", expectedOutput: "All tied employees included", description: "Multiple employees with same max salary" }
    ]
  },
  {
    id: "code-sql-duplicate-emails",
    text: "SQL Query: Duplicate Emails: Write an SQL query to report all the duplicate emails. Note that it's guaranteed that the email field is not NULL. Return table with column Email.",
    type: "Coding",
    difficulty: "Easy",
    category: "SQL Queries & Aggregations",
    subject: "SQL",
    functionName: "duplicateEmails",
    codingTemplate: `SELECT email AS Email\nFROM Person\nGROUP BY email\nHAVING COUNT(email) > 1;`,
    starterTemplates: {
      sql: `SELECT email AS Email\nFROM Person\nGROUP BY email\nHAVING COUNT(email) > 1;`,
      javascript: `// SQL query`,
      python: `# SQL query`,
      java: `// SQL query`,
      cpp: `// SQL query`
    },
    expectedOutput: "Email column with emails having count > 1",
    testCases: [
      { id: 1, input: "Person table with duplicate 'a@b.com'", expectedOutput: "a@b.com", description: "Email count > 1" },
      { id: 2, input: "All unique emails", expectedOutput: "0 rows", description: "No duplicates" }
    ]
  }
];

export function getShuffledCodingQuestions(count: number = 5, subject?: string, difficulty?: string): CodingQuestion[] {
  let pool = [...CODING_QUESTIONS_BANK];

  if (subject) {
    const sLower = subject.toLowerCase();
    if (sLower.includes("sql")) {
      const sqlPool = pool.filter(q => q.subject === "SQL" || q.category.toLowerCase().includes("sql"));
      if (sqlPool.length > 0) pool = sqlPool;
    }
  }

  // Shuffle pool with high entropy
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, count);
}
