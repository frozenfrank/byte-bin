# Platform Speed Comparsion

## Results

| Metric | WSL (Baseline) | macOS | Windows |
| --- | --- | --- | --- |
| **Initial Run (Improved)** | 1.00x | 6.39x | 43.57x |
| **Reinitialization (Improved)** | 1.00x | 2.68x | 44.46x |
| **Initial Run (Original)** | 1.00x | 4.43x | 45.42x |
| **Reinitialization (Original)** | 1.00x | 2.48x | 40.54x |

Windows is operating at approximately 40 to 45 times the duration of WSL across all metrics. macOS performs closer to the baseline but is still roughly 2.5 to 6.5 times slower than WSL depending on the specific operation.

## Source Code

```python
data = {
    'Stat': ['Initial Run (Improved)', 'Reinitialization (Improved)', 'Initial Run (Original)', 'Reinitialization (Original)'],
    'macOS': [1.399, 0.585, 2.084, 1.289],
    'Windows': [9.541, 9.692, 21.346, 21.080],
    'WSL': [0.219, 0.218, 0.470, 0.520]
}

print("macOS Multipliers:")
for i in range(4):
    print(f"{data['Stat'][i]}: {data['macOS'][i] / data['WSL'][i]:.2f}x")

print("\nWindows Multipliers:")
for i in range(4):
    print(f"{data['Stat'][i]}: {data['Windows'][i] / data['WSL'][i]:.2f}x")
```

```text
macOS Multipliers:
Initial Run (Improved): 6.39x
Reinitialization (Improved): 2.68x
Initial Run (Original): 4.43x
Reinitialization (Original): 2.48x

Windows Multipliers:
Initial Run (Improved): 43.57x
Reinitialization (Improved): 44.46x
Initial Run (Original): 45.42x
Reinitialization (Original): 40.54x
```
