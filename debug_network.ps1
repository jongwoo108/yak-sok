$ip = Get-NetIPAddress | Where-Object {$_.AddressFamily -eq 'IPv4' -and $_.InterfaceAlias -notlike '*Loopback*'} | Select-Object IPAddress, InterfaceAlias
"--- IP Addresses ---" | Out-File -Encoding UTF8 c:\yak-sok\debug_network_output.txt
$ip | Out-String | Out-File -Append -Encoding UTF8 c:\yak-sok\debug_network_output.txt

"--- Port 8000 Status ---" | Out-File -Append -Encoding UTF8 c:\yak-sok\debug_network_output.txt
$port = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
if ($port) { "Listening" | Out-File -Append -Encoding UTF8 c:\yak-sok\debug_network_output.txt } else { "Not Listening" | Out-File -Append -Encoding UTF8 c:\yak-sok\debug_network_output.txt }

"--- Firewall Testing ---" | Out-File -Append -Encoding UTF8 c:\yak-sok\debug_network_output.txt
