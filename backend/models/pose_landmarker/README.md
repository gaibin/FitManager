# MediaPipe Pose Landmarker Heavy

将官方 `pose_landmarker_heavy.task` 模型放在本目录，并设置环境变量：

```powershell
$env:POSE_LANDMARKER_MODEL = (Resolve-Path "backend/models/pose_landmarker/pose_landmarker_heavy.task")
python backend/app.py
```

配置成功后，V2 响应中的 `pose_engine` 为 `mediapipe-tasks-heavy`，同时返回 33 个图像节点、估算世界坐标和分割蒙版。若未配置模型，服务使用 MediaPipe Solutions `model_complexity=2`，并明确返回 `mediapipe-legacy-heavy`，不会将其伪装成 Tasks 模型。

模型文件较大，不随仓库提交；应从 MediaPipe 官方 Pose Landmarker 文档列出的模型包获取并核验来源。
