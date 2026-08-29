# 守护脚本：检测 8080 端口是否被监听，未监听则拉起 node server.js
$port = 8080
$exe = "C:\Users\Administrator\.workbuddy\binaries\node\versions\22.22.2\node.exe"
# 基于脚本自身所在目录定位 server.js，移动文件夹后无需改这里
$wd = $PSScriptRoot
$script = Join-Path $PSScriptRoot "server.js"
$log = Join-Path $PSScriptRoot "watchdog.log"

$alive = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient('127.0.0.1', $port)
    if ($tcp.Connected) { $alive = $true }
    $tcp.Close()
} catch { }

if (-not $alive) {
    Start-Process -FilePath $exe -ArgumentList $script -WorkingDirectory $wd -WindowStyle Hidden
    "$(Get-Date) watchdog started server" | Out-File $log -Append
}
