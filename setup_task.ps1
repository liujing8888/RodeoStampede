$log = "F:\网站\task_setup.log"
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File F:\网站\watchdog.ps1"
    # 登录即启动 + 每 30 分钟保活一次（server 常驻，无需 5 分钟那么勤）
    $trig1 = New-ScheduledTaskTrigger -AtLogOn
    $trig2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 30) -RepetitionDuration ([TimeSpan]::MaxValue)
    # 隐藏运行，电池也跑，单次最多 2 分钟
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 2) -Hidden
    # 用 SYSTEM 账户运行（非交互）→ 不再弹出"任务已完成"对话框，且不影响网站
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
    $existing = Get-ScheduledTask -TaskName "CrazyZooSite" -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName "CrazyZooSite" -Confirm:$false }
    Register-ScheduledTask -TaskName "CrazyZooSite" -Action $action -Trigger @($trig1, $trig2) -Settings $settings -Principal $principal -Force | Out-Null
    $t = Get-ScheduledTask -TaskName "CrazyZooSite"
    "OK state=$($t.State) triggers=$($t.Triggers.Count) runAs=$($t.Principal.UserId)" | Out-File $log -Encoding utf8
} catch {
    "ERROR: $_" | Out-File $log -Encoding utf8
}
