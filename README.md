# Assignment 4: Student Choice

See the [assignment page](https://ucsd-cse-115-215.github.io/sp26/assignments/a4-assignment.html) for full requirements.
 
Youtube Video: https://youtu.be/FaaoXuaau3M

Project:
This is a magic the gathering scanner and deck builder app that allows the users to import photos of their own collection and have those cards be save in one location. There will be a deck builder agent added in the following submission. 

General Desgin Points: 
I chose to use render and supabase since they're both easy to work with without have other external issues. 

Eval Testing:


Running eval: 6 cards × 2 models × 2 prompts
Total API calls: 24

Testing Haiku 4.5 / minimal ... done (100.0% accuracy)
Testing Haiku 4.5 / explicit ... done (100.0% accuracy)
Testing Sonnet 4 (prod) / minimal ... done (100.0% accuracy)
Testing Sonnet 4 (prod) / explicit ... done (100.0% accuracy)

--- Results ---

+----------------------------+--------------+------------+-------------+------------+-------------+
| Configuration              | Accuracy     | Avg In Tok | Avg Out Tok | Total Cost | Avg Latency |
+----------------------------+--------------+------------+-------------+------------+-------------+
| Haiku 4.5 / minimal        | 100.0% (6/6) | 1421       | 8           | $0.007019  | 2003ms      |
| Haiku 4.5 / explicit       | 100.0% (6/6) | 1431       | 8           | $0.007067  | 1792ms      |
| Sonnet 4 (prod) / minimal  | 100.0% (6/6) | 1421       | 8           | $0.026322  | 2183ms      |
| Sonnet 4 (prod) / explicit | 100.0% (6/6) | 1431       | 8           | $0.026502  | 2333ms      |
+----------------------------+--------------+------------+-------------+------------+-------------+

Full results saved → eval/results-2026-06-09.json
