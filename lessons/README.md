<!-- Written by `npm run lessons` from the lesson data in src/data. Edit the lesson there, not this page. -->

# AI Engineer Path: every lesson

All 234 lessons, readable here on GitHub. Each page has the full lesson: the idea step by step, a diagram, a worked example, the exercises with their answers folded away, and the questions to check yourself.

The lessons are best on the site, [learn.hamropedia.com](https://learn.hamropedia.com): every lesson there also has an animation, a five-minute practice game, and words you can tap for a plain-English meaning.

Found a mistake? [Open an issue](https://github.com/iammanoj807/ai-engineer-path/issues/new/choose), or fix the lesson in `src/data` and run `npm run lessons`: see [CONTRIBUTING.md](../CONTRIBUTING.md).

## ML Foundations

Maths, machine learning, deep learning and LLMs, from scratch. 8 units · 101 lessons.

### Unit 0 · Your toolkit

Get fast with the tools you will use every day. This unit is short: do it alongside the start of Unit 1. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/toolkit/)

1. [Meet machine learning: the big picture](ml-foundations/unit-0-toolkit/meet-machine-learning-the-big-picture.md)
2. [Python basics: variables, lists, loops and functions](ml-foundations/unit-0-toolkit/python-basics-variables-lists-loops-and-functions.md)
3. [NumPy arrays, shapes and indexing](ml-foundations/unit-0-toolkit/numpy-arrays-shapes-and-indexing.md)
4. [Broadcasting and vectorisation](ml-foundations/unit-0-toolkit/broadcasting-and-vectorisation.md)
5. [Plotting results with Matplotlib](ml-foundations/unit-0-toolkit/plotting-results-with-matplotlib.md)
6. [Git and GitHub for your projects](ml-foundations/unit-0-toolkit/git-and-github-for-your-projects.md)
7. [Testing numerical code (np.allclose, pytest)](ml-foundations/unit-0-toolkit/testing-numerical-code-np-allclose-pytest.md)

### Unit 1 · Math foundations

The language of ML. You will see matrices as movements of space, gradients as directions, and loss functions as probabilities. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/math/)

1. [Vectors, span and basis](ml-foundations/unit-1-math/vectors-span-and-basis.md)
2. [Matrices as transformations; matrix multiplication](ml-foundations/unit-1-math/matrices-as-transformations-matrix-multiplication.md)
3. [Determinants](ml-foundations/unit-1-math/determinants.md)
4. [Inverse, rank and solving Ax = b](ml-foundations/unit-1-math/inverse-rank-and-solving-ax-b.md)
5. [Dot product, projection and orthogonality](ml-foundations/unit-1-math/dot-product-projection-and-orthogonality.md)
6. [Eigenvalues and eigenvectors](ml-foundations/unit-1-math/eigenvalues-and-eigenvectors.md)
7. [SVD, and the maths behind PCA](ml-foundations/unit-1-math/svd-and-the-maths-behind-pca.md)
8. [Derivatives and the chain rule](ml-foundations/unit-1-math/derivatives-and-the-chain-rule.md)
9. [Partial derivatives, gradients and Jacobians](ml-foundations/unit-1-math/partial-derivatives-gradients-and-jacobians.md)
10. [Gradient descent and the learning rate](ml-foundations/unit-1-math/gradient-descent-and-the-learning-rate.md)
11. [Random variables, distributions, expectation and variance](ml-foundations/unit-1-math/random-variables-distributions-expectation-and-variance.md)
12. [Conditional probability and Bayes’ rule](ml-foundations/unit-1-math/conditional-probability-and-bayes-rule.md)
13. [Maximum likelihood estimation](ml-foundations/unit-1-math/maximum-likelihood-estimation.md)
14. [Statistics: sampling, confidence intervals, hypothesis tests](ml-foundations/unit-1-math/statistics-sampling-confidence-intervals-hypothesis-tests.md)
15. [Entropy, cross-entropy and KL divergence](ml-foundations/unit-1-math/entropy-cross-entropy-and-kl-divergence.md)
16. [Convex optimisation: constraints, Lagrange multipliers and duality](ml-foundations/unit-1-math/convex-optimisation-constraints-lagrange-multipliers-and-duality.md)

### Unit 2 · Classical ML, built by you

Build every classic algorithm yourself in NumPy. After this unit, a library is only a shortcut for something you already understand. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/classical-ml/)

1. [The ML setup: features, labels, loss, train/validation/test](ml-foundations/unit-2-classical-ml/the-ml-setup-features-labels-loss-train-validation-test.md)
2. [Linear regression: normal equation and gradient descent](ml-foundations/unit-2-classical-ml/linear-regression-normal-equation-and-gradient-descent.md)
3. [Logistic regression and the sigmoid](ml-foundations/unit-2-classical-ml/logistic-regression-and-the-sigmoid.md)
4. [Regularisation: L1 and L2](ml-foundations/unit-2-classical-ml/regularisation-l1-and-l2.md)
5. [Bias–variance trade-off and overfitting](ml-foundations/unit-2-classical-ml/bias-variance-trade-off-and-overfitting.md)
6. [Metrics: precision, recall, F1, ROC-AUC, confusion matrix](ml-foundations/unit-2-classical-ml/metrics-precision-recall-f1-roc-auc-confusion-matrix.md)
7. [Cross-validation and data leakage](ml-foundations/unit-2-classical-ml/cross-validation-and-data-leakage.md)
8. [Feature scaling and encoding](ml-foundations/unit-2-classical-ml/feature-scaling-and-encoding.md)
9. [k-nearest neighbours](ml-foundations/unit-2-classical-ml/k-nearest-neighbours.md)
10. [Decision trees: entropy and Gini](ml-foundations/unit-2-classical-ml/decision-trees-entropy-and-gini.md)
11. [Ensembles: bagging, random forests, gradient boosting](ml-foundations/unit-2-classical-ml/ensembles-bagging-random-forests-gradient-boosting.md)
12. [Support vector machines: margin and hinge loss](ml-foundations/unit-2-classical-ml/support-vector-machines-margin-and-hinge-loss.md)
13. [Naive Bayes](ml-foundations/unit-2-classical-ml/naive-bayes.md)
14. [k-means clustering](ml-foundations/unit-2-classical-ml/k-means-clustering.md)
15. [PCA in practice](ml-foundations/unit-2-classical-ml/pca-in-practice.md)
16. [Gaussian mixture models and EM](ml-foundations/unit-2-classical-ml/gaussian-mixture-models-and-em.md)
17. [Generalisation: VC dimension and double descent](ml-foundations/unit-2-classical-ml/generalisation-vc-dimension-and-double-descent.md)

### Unit 3 · Deep learning foundations

Build neural networks from a single neuron up. Write backprop by hand first. Then you can trust PyTorch, because you know what it does. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/deep-learning/)

1. [The neuron and the multi-layer perceptron](ml-foundations/unit-3-deep-learning/the-neuron-and-the-multi-layer-perceptron.md)
2. [Activation functions, and why non-linearity matters](ml-foundations/unit-3-deep-learning/activation-functions-and-why-non-linearity-matters.md)
3. [Backpropagation by hand](ml-foundations/unit-3-deep-learning/backpropagation-by-hand.md)
4. [Autograd and computational graphs](ml-foundations/unit-3-deep-learning/autograd-and-computational-graphs.md)
5. [Softmax and cross-entropy loss](ml-foundations/unit-3-deep-learning/softmax-and-cross-entropy-loss.md)
6. [Optimisers: SGD, momentum, Adam; learning-rate schedules](ml-foundations/unit-3-deep-learning/optimisers-sgd-momentum-adam-learning-rate-schedules.md)
7. [Weight initialisation; vanishing and exploding gradients](ml-foundations/unit-3-deep-learning/weight-initialisation-vanishing-and-exploding-gradients.md)
8. [Batch norm and layer norm](ml-foundations/unit-3-deep-learning/batch-norm-and-layer-norm.md)
9. [Regularisation: dropout, weight decay, augmentation, early stopping](ml-foundations/unit-3-deep-learning/regularisation-dropout-weight-decay-augmentation-early-stopping.md)
10. [PyTorch: nn.Module, DataLoader and the training loop](ml-foundations/unit-3-deep-learning/pytorch-nn-module-dataloader-and-the-training-loop.md)
11. [Convolutional networks: convolution, pooling, receptive field](ml-foundations/unit-3-deep-learning/convolutional-networks-convolution-pooling-receptive-field.md)
12. [Residual connections (ResNet)](ml-foundations/unit-3-deep-learning/residual-connections-resnet.md)
13. [RNNs, and why long sequences are hard](ml-foundations/unit-3-deep-learning/rnns-and-why-long-sequences-are-hard.md)
14. [Embeddings: representing things as vectors](ml-foundations/unit-3-deep-learning/embeddings-representing-things-as-vectors.md)
15. [Debugging training: overfit one batch, read loss curves](ml-foundations/unit-3-deep-learning/debugging-training-overfit-one-batch-read-loss-curves.md)
16. [LSTMs and GRUs: gates for long memory](ml-foundations/unit-3-deep-learning/lstms-and-grus-gates-for-long-memory.md)

### Unit 4 · Transformers and LLMs

Build a small GPT from scratch: tokenizer, attention, training and fine-tuning. This is how modern AI works inside. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/llms/)

1. [Tokenisation and byte-pair encoding (BPE)](ml-foundations/unit-4-llms/tokenisation-and-byte-pair-encoding-bpe.md)
2. [Token embeddings and positional encoding](ml-foundations/unit-4-llms/token-embeddings-and-positional-encoding.md)
3. [Self-attention: queries, keys and values](ml-foundations/unit-4-llms/self-attention-queries-keys-and-values.md)
4. [Multi-head attention and the transformer block](ml-foundations/unit-4-llms/multi-head-attention-and-the-transformer-block.md)
5. [GPT-style models and next-token prediction](ml-foundations/unit-4-llms/gpt-style-models-and-next-token-prediction.md)
6. [Encoder models (BERT) vs decoder models (GPT)](ml-foundations/unit-4-llms/encoder-models-bert-vs-decoder-models-gpt.md)
7. [Vision transformers and CLIP](ml-foundations/unit-4-llms/vision-transformers-and-clip.md)
8. [Sampling: greedy, temperature, top-k, top-p](ml-foundations/unit-4-llms/sampling-greedy-temperature-top-k-top-p.md)
9. [KV cache and the cost of generation](ml-foundations/unit-4-llms/kv-cache-and-the-cost-of-generation.md)
10. [Pretraining data and scaling laws](ml-foundations/unit-4-llms/pretraining-data-and-scaling-laws.md)
11. [Mixture of experts](ml-foundations/unit-4-llms/mixture-of-experts.md)
12. [Fine-tuning and LoRA](ml-foundations/unit-4-llms/fine-tuning-and-lora.md)
13. [Instruction tuning and preference tuning (RLHF, DPO)](ml-foundations/unit-4-llms/instruction-tuning-and-preference-tuning-rlhf-dpo.md)
14. [Reasoning models and test-time compute](ml-foundations/unit-4-llms/reasoning-models-and-test-time-compute.md)

### Unit 5 · AI engineering

Turn foundation models into real products: retrieval, evaluation, agents and deployment. This is the core of most AI engineer jobs. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/ai-engineering/)

1. [Prompting: clear instructions, examples, structured output](ml-foundations/unit-5-ai-engineering/prompting-clear-instructions-examples-structured-output.md)
2. [Structured outputs and function calling](ml-foundations/unit-5-ai-engineering/structured-outputs-and-function-calling.md)
3. [Embeddings and semantic search](ml-foundations/unit-5-ai-engineering/embeddings-and-semantic-search.md)
4. [Vector databases and approximate nearest-neighbour search](ml-foundations/unit-5-ai-engineering/vector-databases-and-approximate-nearest-neighbour-search.md)
5. [RAG: chunking, retrieval and re-ranking](ml-foundations/unit-5-ai-engineering/rag-chunking-retrieval-and-re-ranking.md)
6. [Context engineering: long context and memory](ml-foundations/unit-5-ai-engineering/context-engineering-long-context-and-memory.md)
7. [Evaluation: test sets, LLM-as-judge, error analysis](ml-foundations/unit-5-ai-engineering/evaluation-test-sets-llm-as-judge-error-analysis.md)
8. [Agents and tool use](ml-foundations/unit-5-ai-engineering/agents-and-tool-use.md)
9. [MCP: connecting models to tools and data](ml-foundations/unit-5-ai-engineering/mcp-connecting-models-to-tools-and-data.md)
10. [Choosing between prompting, RAG and fine-tuning](ml-foundations/unit-5-ai-engineering/choosing-between-prompting-rag-and-fine-tuning.md)
11. [Dataset engineering for fine-tuning](ml-foundations/unit-5-ai-engineering/dataset-engineering-for-fine-tuning.md)
12. [Serving: APIs, Docker, latency and cost](ml-foundations/unit-5-ai-engineering/serving-apis-docker-latency-and-cost.md)
13. [Caching, model routing and cost control](ml-foundations/unit-5-ai-engineering/caching-model-routing-and-cost-control.md)
14. [Observability: tracing and debugging LLM apps](ml-foundations/unit-5-ai-engineering/observability-tracing-and-debugging-llm-apps.md)
15. [Safety: guardrails and prompt injection](ml-foundations/unit-5-ai-engineering/safety-guardrails-and-prompt-injection.md)
16. [ML system design: pipelines, training vs serving, drift](ml-foundations/unit-5-ai-engineering/ml-system-design-pipelines-training-vs-serving-drift.md)

### Unit 6 · Systems and scale

Make models fast and cheap. Understand what limits speed and memory on a GPU, and how training works across many GPUs. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/systems/)

1. [How a GPU works: compute vs memory](ml-foundations/unit-6-systems/how-a-gpu-works-compute-vs-memory.md)
2. [Mixed precision: fp16 and bf16](ml-foundations/unit-6-systems/mixed-precision-fp16-and-bf16.md)
3. [Training memory: weights, gradients, optimiser states, activations](ml-foundations/unit-6-systems/training-memory-weights-gradients-optimiser-states-activations.md)
4. [Parallelism: data, tensor and pipeline (the ideas)](ml-foundations/unit-6-systems/parallelism-data-tensor-and-pipeline-the-ideas.md)
5. [Inference speed: batching, quantisation, FlashAttention](ml-foundations/unit-6-systems/inference-speed-batching-quantisation-flashattention.md)
6. [Profiling PyTorch code](ml-foundations/unit-6-systems/profiling-pytorch-code.md)
7. [GPU kernels with Triton](ml-foundations/unit-6-systems/gpu-kernels-with-triton.md)
8. [Pruning and distillation](ml-foundations/unit-6-systems/pruning-and-distillation.md)
9. [Speculative decoding](ml-foundations/unit-6-systems/speculative-decoding.md)

### Unit 7 · Generative models and reinforcement learning

Models that create new data, and models that learn by trial and error. These ideas power image generators, and the reinforcement learning behind RLHF. [Unit guide on the site](https://learn.hamropedia.com/foundations/unit/generative-rl/)

1. [Autoencoders and VAEs (the ELBO)](ml-foundations/unit-7-generative-rl/autoencoders-and-vaes-the-elbo.md)
2. [GANs: a generator against a discriminator](ml-foundations/unit-7-generative-rl/gans-a-generator-against-a-discriminator.md)
3. [Diffusion models](ml-foundations/unit-7-generative-rl/diffusion-models.md)
4. [Reinforcement learning basics: states, actions, rewards, values](ml-foundations/unit-7-generative-rl/reinforcement-learning-basics-states-actions-rewards-values.md)
5. [Deep Q-networks (DQN): Q-learning with a neural network](ml-foundations/unit-7-generative-rl/deep-q-networks-dqn-q-learning-with-a-neural-network.md)
6. [Policy gradients and PPO](ml-foundations/unit-7-generative-rl/policy-gradients-and-ppo.md)

## SQL

From your first SELECT to window functions and interview problems. 9 units · 61 lessons.

### Unit 0 · Start here: databases, tables and SQL

Know what a database is, what a table, a row and a key are, and the six practice tables you will use in every lesson. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/start-here/)

1. [What a database, a table and SQL are](sql/unit-0-start-here/what-a-database-a-table-and-sql-are.md)
2. [Meet the practice database](sql/unit-0-start-here/meet-the-practice-database.md)
3. [Keys and relationships: primary keys, foreign keys, one-to-many, many-to-many](sql/unit-0-start-here/keys-and-relationships-primary-keys-foreign-keys-one-to-many.md)
4. [Data types: numbers, text, dates and true/false](sql/unit-0-start-here/data-types-numbers-text-dates-and-true-false.md)

### Unit 1 · Reading data: SELECT, WHERE and sorting

Pick the columns you want, keep only the rows you want, sort them, and handle the missing values that trip everyone up. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/reading-data/)

1. [SELECT and FROM: choosing columns](sql/unit-1-reading-data/select-and-from-choosing-columns.md)
2. [WHERE: keeping only the rows you want](sql/unit-1-reading-data/where-keeping-only-the-rows-you-want.md)
3. [IN, BETWEEN and LIKE: shorter conditions](sql/unit-1-reading-data/in-between-and-like-shorter-conditions.md)
4. [NULL: the missing value](sql/unit-1-reading-data/null-the-missing-value.md)
5. [ORDER BY, LIMIT and OFFSET: sorting and top N](sql/unit-1-reading-data/order-by-limit-and-offset-sorting-and-top-n.md)
6. [DISTINCT: removing duplicate rows](sql/unit-1-reading-data/distinct-removing-duplicate-rows.md)
7. [CASE WHEN: if-then logic inside a query](sql/unit-1-reading-data/case-when-if-then-logic-inside-a-query.md)
8. [Built-in functions for text, numbers and dates](sql/unit-1-reading-data/built-in-functions-for-text-numbers-and-dates.md)

### Unit 2 · Summarising data: aggregates, GROUP BY and HAVING

Turn many rows into answers — totals, averages, counts per group — and know exactly which rows each number is built from. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/summarising/)

1. [Aggregate functions: COUNT, SUM, AVG, MIN and MAX](sql/unit-2-summarising/aggregate-functions-count-sum-avg-min-and-max.md)
2. [GROUP BY: one result row per group](sql/unit-2-summarising/group-by-one-result-row-per-group.md)
3. [HAVING: filtering groups, and how it differs from WHERE](sql/unit-2-summarising/having-filtering-groups-and-how-it-differs-from-where.md)
4. [Conditional aggregation: counting several things at once](sql/unit-2-summarising/conditional-aggregation-counting-several-things-at-once.md)
5. [The order a query really runs in](sql/unit-2-summarising/the-order-a-query-really-runs-in.md)

### Unit 3 · Joins: combining tables

Put rows from two or more tables side by side, keep or drop the rows that have no match on purpose, and spot the joins that quietly double your totals. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/joins/)

1. [Joins, and INNER JOIN](sql/unit-3-joins/joins-and-inner-join.md)
2. [LEFT JOIN: keep every row from one side](sql/unit-3-joins/left-join-keep-every-row-from-one-side.md)
3. [Finding what is missing: anti-joins](sql/unit-3-joins/finding-what-is-missing-anti-joins.md)
4. [Self joins: a table joined to itself](sql/unit-3-joins/self-joins-a-table-joined-to-itself.md)
5. [Joining three or more tables](sql/unit-3-joins/joining-three-or-more-tables.md)
6. [FULL OUTER JOIN and CROSS JOIN](sql/unit-3-joins/full-outer-join-and-cross-join.md)
7. [Join traps: double counting, and ON versus WHERE](sql/unit-3-joins/join-traps-double-counting-and-on-versus-where.md)

### Unit 4 · Subqueries, CTEs and set operations

Use the result of one query inside another, break hard questions into named steps with WITH, walk trees with recursion, and stack results with UNION. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/subqueries/)

1. [Subqueries: a query inside a query](sql/unit-4-subqueries/subqueries-a-query-inside-a-query.md)
2. [Correlated subqueries, EXISTS, and the NOT IN trap](sql/unit-4-subqueries/correlated-subqueries-exists-and-the-not-in-trap.md)
3. [CTEs: naming each step with WITH](sql/unit-4-subqueries/ctes-naming-each-step-with-with.md)
4. [Recursive CTEs: walking trees and filling in dates](sql/unit-4-subqueries/recursive-ctes-walking-trees-and-filling-in-dates.md)
5. [UNION, UNION ALL, INTERSECT and EXCEPT](sql/unit-4-subqueries/union-union-all-intersect-and-except.md)

### Unit 5 · Window functions: ranking, running totals and comparing rows

Calculate across related rows — rank them, compare each with the one before, keep running totals — without losing the individual rows the way GROUP BY does. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/window-functions/)

1. [What a window function is: OVER and PARTITION BY](sql/unit-5-window-functions/what-a-window-function-is-over-and-partition-by.md)
2. [Ranking: ROW_NUMBER, RANK and DENSE_RANK](sql/unit-5-window-functions/ranking-row-number-rank-and-dense-rank.md)
3. [LAG and LEAD: comparing with the previous or next row](sql/unit-5-window-functions/lag-and-lead-comparing-with-the-previous-or-next-row.md)
4. [Running totals and moving averages: window frames](sql/unit-5-window-functions/running-totals-and-moving-averages-window-frames.md)
5. [Share of total, NTILE and FIRST_VALUE](sql/unit-5-window-functions/share-of-total-ntile-and-first-value.md)

### Unit 6 · Building tables and changing data

Create tables with the right rules, add, change and remove rows safely, group changes into transactions, and design tables that don't contradict themselves. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/changing-data/)

1. [CREATE TABLE and ALTER TABLE](sql/unit-6-changing-data/create-table-and-alter-table.md)
2. [Constraints: the rules that keep bad data out](sql/unit-6-changing-data/constraints-the-rules-that-keep-bad-data-out.md)
3. [INSERT, UPDATE and DELETE](sql/unit-6-changing-data/insert-update-and-delete.md)
4. [Transactions and ACID](sql/unit-6-changing-data/transactions-and-acid.md)
5. [Normalisation: designing tables that don't contradict themselves](sql/unit-6-changing-data/normalisation-designing-tables-that-dont-contradict-themselves.md)
6. [Views: saved queries you can use like tables](sql/unit-6-changing-data/views-saved-queries-you-can-use-like-tables.md)
7. [DDL, DML, DCL, TCL — and DELETE versus TRUNCATE versus DROP](sql/unit-6-changing-data/ddl-dml-dcl-tcl-and-delete-versus-truncate-versus-drop.md)

### Unit 7 · Performance: indexes and query plans

Know why a query is slow, read the plan the database chose, and write queries and indexes that let it find rows without reading the whole table. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/performance/)

1. [Indexes: how a B-tree makes lookups fast](sql/unit-7-performance/indexes-how-a-b-tree-makes-lookups-fast.md)
2. [Reading a query plan with EXPLAIN](sql/unit-7-performance/reading-a-query-plan-with-explain.md)
3. [Index-friendly queries: sargable filters and composite indexes](sql/unit-7-performance/index-friendly-queries-sargable-filters-and-composite-indexes.md)
4. [How a database runs a join: nested loop, hash join, merge join](sql/unit-7-performance/how-a-database-runs-a-join-nested-loop-hash-join-merge-join.md)

### Unit 8 · SQL interview problems, from easy to hard

Solve the classic SQL interview questions from a blank page, explain your approach while you write, and name the edge cases before the interviewer does. [Unit guide on the site](https://learn.hamropedia.com/sql/unit/interview-problems/)

1. [How to answer any SQL interview question](sql/unit-8-interview-problems/how-to-answer-any-sql-interview-question.md)
2. [Quick-fire SQL theory questions](sql/unit-8-interview-problems/quick-fire-sql-theory-questions.md)
3. [The second highest salary (and the Nth)](sql/unit-8-interview-problems/the-second-highest-salary-and-the-nth.md)
4. [Employees who earn more than their manager](sql/unit-8-interview-problems/employees-who-earn-more-than-their-manager.md)
5. [Customers who have never had an order delivered](sql/unit-8-interview-problems/customers-who-have-never-had-an-order-delivered.md)
6. [Find duplicate emails, then remove the duplicates](sql/unit-8-interview-problems/find-duplicate-emails-then-remove-the-duplicates.md)
7. [The highest-paid employee in each department](sql/unit-8-interview-problems/the-highest-paid-employee-in-each-department.md)
8. [Employees paid above their department's average](sql/unit-8-interview-problems/employees-paid-above-their-departments-average.md)
9. [Month-over-month revenue growth](sql/unit-8-interview-problems/month-over-month-revenue-growth.md)
10. [Each customer's first order](sql/unit-8-interview-problems/each-customers-first-order.md)
11. [Streaks: orders on consecutive days (gaps and islands)](sql/unit-8-interview-problems/streaks-orders-on-consecutive-days-gaps-and-islands.md)
12. [Products bought together](sql/unit-8-interview-problems/products-bought-together.md)
13. [Which products make up 80% of revenue? (share of total)](sql/unit-8-interview-problems/which-products-make-up-80-of-revenue-share-of-total.md)
14. [Retention: who came back within 30 days?](sql/unit-8-interview-problems/retention-who-came-back-within-30-days.md)
15. [The median salary](sql/unit-8-interview-problems/the-median-salary.md)
16. [Customers who bought every product in a category](sql/unit-8-interview-problems/customers-who-bought-every-product-in-a-category.md)

## System Design

The building blocks, then real designs, the way interviews ask them. 10 units · 72 lessons.

### Unit 0 · How system design interviews work

Learn the step-by-step way to answer any design question before you learn the parts. Without a method, even good knowledge comes out messy under pressure. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/interview-basics/)

1. [Meet the building blocks: a map of a typical web system](system-design/unit-0-interview-basics/meet-the-building-blocks-a-map-of-a-typical-web-system.md)
2. [The high-level design interview: a step-by-step answer framework](system-design/unit-0-interview-basics/the-high-level-design-interview-a-step-by-step-answer-framework.md)
3. [Back-of-the-envelope estimation](system-design/unit-0-interview-basics/back-of-the-envelope-estimation.md)
4. [The low-level design interview: a step-by-step approach](system-design/unit-0-interview-basics/the-low-level-design-interview-a-step-by-step-approach.md)

### Unit 1 · Networking and APIs

Understand how a request travels from a phone or browser to your servers and back, and how to design the API it calls. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/networking/)

1. [Client–server, DNS, and what happens when you type a URL](system-design/unit-1-networking/client-server-dns-and-what-happens-when-you-type-a-url.md)
2. [HTTP and REST API design](system-design/unit-1-networking/http-and-rest-api-design.md)
3. [Real-time communication: polling, long polling, WebSockets, SSE](system-design/unit-1-networking/real-time-communication-polling-long-polling-websockets-sse.md)
4. [CDN (content delivery network)](system-design/unit-1-networking/cdn-content-delivery-network.md)
5. [Proxies, reverse proxies and API gateways](system-design/unit-1-networking/proxies-reverse-proxies-and-api-gateways.md)

### Unit 2 · Core concepts: scale, reliability and speed

The ten ideas every high-level design uses: scalability, availability, fault tolerance, load balancing, caching, consistency and CAP, rate limiting, asynchronous processing, and observability. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/core-concepts/)

1. [Scalability: vertical vs horizontal](system-design/unit-2-core-concepts/scalability-vertical-vs-horizontal.md)
2. [Availability: nines, SLAs and redundancy](system-design/unit-2-core-concepts/availability-nines-slas-and-redundancy.md)
3. [Fault tolerance: timeouts, retries, circuit breakers](system-design/unit-2-core-concepts/fault-tolerance-timeouts-retries-circuit-breakers.md)
4. [Load balancing](system-design/unit-2-core-concepts/load-balancing.md)
5. [Caching](system-design/unit-2-core-concepts/caching.md)
6. [Consistency, CAP and PACELC](system-design/unit-2-core-concepts/consistency-cap-and-pacelc.md)
7. [Rate limiting and backpressure](system-design/unit-2-core-concepts/rate-limiting-and-backpressure.md)
8. [Asynchronous processing and message queues (Kafka, SQS)](system-design/unit-2-core-concepts/asynchronous-processing-and-message-queues-kafka-sqs.md)
9. [Observability: logs, metrics and traces](system-design/unit-2-core-concepts/observability-logs-metrics-and-traces.md)

### Unit 3 · Data: databases, storage and scaling data

Choose the right database, keep data correct with transactions, make queries fast with indexes, and scale data with replication and sharding. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/data/)

1. [SQL vs NoSQL: choosing a database](system-design/unit-3-data/sql-vs-nosql-choosing-a-database.md)
2. [ACID transactions and isolation levels](system-design/unit-3-data/acid-transactions-and-isolation-levels.md)
3. [Database indexing](system-design/unit-3-data/database-indexing.md)
4. [Replication](system-design/unit-3-data/replication.md)
5. [Partitioning and sharding](system-design/unit-3-data/partitioning-and-sharding.md)
6. [Consistent hashing](system-design/unit-3-data/consistent-hashing.md)
7. [Object storage (S3) for files and media](system-design/unit-3-data/object-storage-s3-for-files-and-media.md)
8. [Search: inverted indexes and Elasticsearch](system-design/unit-3-data/search-inverted-indexes-and-elasticsearch.md)
9. [Unique ID generation](system-design/unit-3-data/unique-id-generation.md)

### Unit 4 · Distributed systems and security

How services split up and stay correct across a network, how machines agree, and how to keep users and data secure. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/distributed/)

1. [Monolith vs microservices](system-design/unit-4-distributed/monolith-vs-microservices.md)
2. [Distributed transactions: sagas and the outbox pattern](system-design/unit-4-distributed/distributed-transactions-sagas-and-the-outbox-pattern.md)
3. [Consensus and leader election (Raft)](system-design/unit-4-distributed/consensus-and-leader-election-raft.md)
4. [Security basics: authentication, authorisation, OAuth and JWT](system-design/unit-4-distributed/security-basics-authentication-authorisation-oauth-and-jwt.md)

### Unit 5 · Low-level design: OOP and SOLID

The building blocks of good class design: the four pillars of OOP, composition over inheritance, the five SOLID principles, class diagrams, and the concurrency basics LLD questions expect. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/oop-solid/)

1. [OOP: the four pillars](system-design/unit-5-oop-solid/oop-the-four-pillars.md)
2. [Composition over inheritance, and interfaces](system-design/unit-5-oop-solid/composition-over-inheritance-and-interfaces.md)
3. [SOLID: S — Single Responsibility Principle](system-design/unit-5-oop-solid/solid-s-single-responsibility-principle.md)
4. [SOLID: O — Open/Closed Principle](system-design/unit-5-oop-solid/solid-o-open-closed-principle.md)
5. [SOLID: L — Liskov Substitution Principle](system-design/unit-5-oop-solid/solid-l-liskov-substitution-principle.md)
6. [SOLID: I — Interface Segregation Principle](system-design/unit-5-oop-solid/solid-i-interface-segregation-principle.md)
7. [SOLID: D — Dependency Inversion Principle](system-design/unit-5-oop-solid/solid-d-dependency-inversion-principle.md)
8. [UML class diagrams and relationships](system-design/unit-5-oop-solid/uml-class-diagrams-and-relationships.md)
9. [Concurrency basics: threads, locks and race conditions](system-design/unit-5-oop-solid/concurrency-basics-threads-locks-and-race-conditions.md)

### Unit 6 · Design patterns

Ten patterns that come up again and again in LLD interviews and real code: three for creating objects, three for structuring them, and four for behaviour. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/patterns/)

1. [Singleton](system-design/unit-6-patterns/singleton.md)
2. [Factory: Factory Method and Abstract Factory](system-design/unit-6-patterns/factory-factory-method-and-abstract-factory.md)
3. [Builder](system-design/unit-6-patterns/builder.md)
4. [Adapter](system-design/unit-6-patterns/adapter.md)
5. [Decorator](system-design/unit-6-patterns/decorator.md)
6. [Facade](system-design/unit-6-patterns/facade.md)
7. [Strategy](system-design/unit-6-patterns/strategy.md)
8. [Observer](system-design/unit-6-patterns/observer.md)
9. [Chain of Responsibility](system-design/unit-6-patterns/chain-of-responsibility.md)
10. [State](system-design/unit-6-patterns/state.md)

### Unit 7 · Low-level design questions

Practise the classic LLD questions end to end: requirements, classes, patterns, the key code and concurrency. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/lld-practice/)

1. [Design a parking lot](system-design/unit-7-lld-practice/design-a-parking-lot.md)
2. [Design an elevator system](system-design/unit-7-lld-practice/design-an-elevator-system.md)
3. [Design Splitwise (expense sharing)](system-design/unit-7-lld-practice/design-splitwise-expense-sharing.md)
4. [Design a vending machine](system-design/unit-7-lld-practice/design-a-vending-machine.md)
5. [Design an LRU cache](system-design/unit-7-lld-practice/design-an-lru-cache.md)
6. [Design an order-matching engine (stock exchange)](system-design/unit-7-lld-practice/design-an-order-matching-engine-stock-exchange.md)

### Unit 8 · High-level design questions

Practise the classic HLD questions with the full framework: requirements, estimates, API, data model, design, deep dives and trade-offs. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/hld-practice/)

1. [Design a URL shortener (like bit.ly)](system-design/unit-8-hld-practice/design-a-url-shortener-like-bit-ly.md)
2. [Design a distributed rate limiter](system-design/unit-8-hld-practice/design-a-distributed-rate-limiter.md)
3. [Design a notification system](system-design/unit-8-hld-practice/design-a-notification-system.md)
4. [Design a chat app (like WhatsApp)](system-design/unit-8-hld-practice/design-a-chat-app-like-whatsapp.md)
5. [Design a news feed (like Twitter or Instagram)](system-design/unit-8-hld-practice/design-a-news-feed-like-twitter-or-instagram.md)
6. [Design a video streaming platform (like YouTube or Netflix)](system-design/unit-8-hld-practice/design-a-video-streaming-platform-like-youtube-or-netflix.md)
7. [Design a ride-hailing app (like Uber)](system-design/unit-8-hld-practice/design-a-ride-hailing-app-like-uber.md)
8. [Design a payment system](system-design/unit-8-hld-practice/design-a-payment-system.md)
9. [Design search autocomplete](system-design/unit-8-hld-practice/design-search-autocomplete.md)
10. [Design a real-time leaderboard](system-design/unit-8-hld-practice/design-a-real-time-leaderboard.md)
11. [Design a distributed cache](system-design/unit-8-hld-practice/design-a-distributed-cache.md)

### Unit 9 · AI and ML system design

The design questions AI and ML engineer interviews ask: RAG assistants, recommendations, fraud detection, LLM serving, and the pipeline that trains and ships models. [Unit guide on the site](https://learn.hamropedia.com/system-design/unit/ai-ml-design/)

1. [Design a RAG assistant over company documents](system-design/unit-9-ai-ml-design/design-a-rag-assistant-over-company-documents.md)
2. [Design a recommendation system](system-design/unit-9-ai-ml-design/design-a-recommendation-system.md)
3. [Design a real-time fraud detection system](system-design/unit-9-ai-ml-design/design-a-real-time-fraud-detection-system.md)
4. [Design an LLM serving platform](system-design/unit-9-ai-ml-design/design-an-llm-serving-platform.md)
5. [Design an ML training and feature pipeline](system-design/unit-9-ai-ml-design/design-an-ml-training-and-feature-pipeline.md)

## Interview questions

- [Machine learning and deep learning](interview-questions/ml.md): 21 questions
- [LLMs, RAG and AI engineering](interview-questions/genai.md): 16 questions
- [SQL in interviews](interview-questions/sql.md): 11 questions
- [System design scenarios](interview-questions/system-design.md): 11 questions
