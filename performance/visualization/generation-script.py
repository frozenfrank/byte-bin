import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

data = {
    'Platform': ['macOS', 'macOS', 'macOS', 'macOS', 'Windows', 'Windows', 'Windows', 'Windows', 'WSL', 'WSL', 'WSL', 'WSL'],
    'Metric': [
        'Initial Run (Improved)', 'Reinit (Improved)', 'Initial Run (Original)', 'Reinit (Original)',
        'Initial Run (Improved)', 'Reinit (Improved)', 'Initial Run (Original)', 'Reinit (Original)',
        'Initial Run (Improved)', 'Reinit (Improved)', 'Initial Run (Original)', 'Reinit (Original)'
    ],
    'Time (s)': [
        1.399, 0.585, 2.084, 1.289,
        9.541, 9.692, 21.346, 21.080,
        0.219, 0.218, 0.470, 0.520
    ]
}

df = pd.DataFrame(data)

# Reorder metrics for better visual flow (Original vs Improved side by side)
metric_order = ['Initial Run (Original)', 'Initial Run (Improved)', 'Reinit (Original)', 'Reinit (Improved)']

plt.figure(figsize=(12, 7))
ax = sns.barplot(data=df, x='Platform', y='Time (s)', hue='Metric', hue_order=metric_order, palette='muted')

plt.title('Platform Performance Comparison: Original vs. Improved Models', fontsize=16)
plt.ylabel('Time (seconds)', fontsize=12)
plt.xlabel('Platform', fontsize=12)

# Add data labels on top of bars
for p in ax.patches:
    height = p.get_height()
    if height > 0:
        ax.annotate(f'{height:.3f}s',
                    (p.get_x() + p.get_width() / 2., height),
                    ha='center', va='bottom',
                    fontsize=9, color='black',
                    xytext=(0, 3),
                    textcoords='offset points')

plt.legend(title='Metrics')
plt.tight_layout()
plt.show()
