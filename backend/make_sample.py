"""Generate sample.parquet with a mix of types for testing ParquetPeek."""
import random
import pyarrow as pa
import pyarrow.parquet as pq

random.seed(42)
N = 2000

lorem = (
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. "
    "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. "
    "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. "
)

table = pa.table({
    "id": list(range(N)),
    "is_active": [random.random() > 0.3 for _ in range(N)],
    "score": [round(random.gauss(50, 15), 2) for _ in range(N)],
    "category": [random.choice(["alpha", "beta", "gamma", "delta", "epsilon"]) for _ in range(N)],
    "tags": [random.choice([None, "urgent", "low-priority", "review", "done"]) for _ in range(N)],
    "description": [(lorem * random.randint(1, 6)).strip() for _ in range(N)],
    "metadata": [{"version": random.randint(1, 9), "owner": random.choice(["alice", "bob", "carol"])} for _ in range(N)],
})

pq.write_table(table, "sample.parquet")
print(f"Wrote sample.parquet with {N} rows and {len(table.column_names)} columns")
print(f"Path: C:\\Users\\devsh\\parquet_making\\backend\\sample.parquet")
