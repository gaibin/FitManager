# V2 试点可靠性验证

建议纳入 20–30 名参与者，同日重复拍摄 3 次，由 2 名教练独立复核。每行填写同一个指标的一次自动测量及其人工摄影测量参考值，字段见 `pilot_template.csv`。

运行：

```powershell
python -m backend.validation.reliability backend/validation/pilot_data.csv
```

输出逐项包含 MAE、ICC(3,1)、SEM 和 MDC95。只有同时满足 MAE ≤ 2°、ICC ≥ 0.90、SEM ≤ 2°、MDC95 ≤ 5° 才标记 `validated`；其余均为 `experimental`，不应参与趋势指数或建议生成。模板不包含示例数值，避免把演示数据误当作验证结果。

完成审核后，可把已达标指标 ID 通过逗号分隔的环境变量启用，例如：

```powershell
$env:POSTURE_VALIDATED_METRICS = "shoulder_line,body_forward_lean"
```

未显式启用的指标在 API 中保持 `validated=false`、`trackable=false`。
