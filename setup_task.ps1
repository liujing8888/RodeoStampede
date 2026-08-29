$log = "F:\网站\task_setup.log"
try {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File F:\网站\watchdog.ps1"
    $trig1 = New-ScheduledTaskTrigger -AtLogOn
    $trig2 = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration ([TimeSpan]::MaxValue)
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Minutes 2)
    $existing = Get-ScheduledTask -TaskName "CrazyZooSite" -ErrorAction SilentlyContinue
    if ($existing) { Unregister-ScheduledTask -TaskName "CrazyZooSite" -Confirm:$false }
    Register-ScheduledTask -TaskName "CrazyZooSite" -Action $action -Trigger @($trig1, $trig2) -Settings $settings -Force | Out-Null
    $t = Get-ScheduledTask -TaskName "CrazyZooSite"
    "OK state=$($t.State) triggers=$($t.Triggers.Count)" | Out-File $log -Encoding utf8
} catch {
    "ERROR: $_" | Out-File $log -Encoding utf8
}
