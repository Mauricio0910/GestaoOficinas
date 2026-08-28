param(
  [string]$TaskName = "GestaoOficinasProApiLocal",
  [string]$NodePath = "node.exe"
)
$ProjectDir = Split-Path -Parent $PSScriptRoot
$ServerJs = Join-Path $ProjectDir "src\server.js"
$Action = New-ScheduledTaskAction -Execute $NodePath -Argument "`"$ServerJs`"" -WorkingDirectory $ProjectDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -RunLevel Highest -Force
Write-Host "Tarefa criada: $TaskName"
