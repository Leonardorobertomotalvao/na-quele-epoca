$ErrorActionPreference = 'Stop'
$initdb = Get-Command initdb -ErrorAction SilentlyContinue
if (-not $initdb) { throw 'PostgreSQL initdb is not installed. No software was installed and no service was started.' }
$root = 'E:\apps\postgres-test'
if (Test-Path "$root\data") { throw 'Test cluster path already exists; refusing to reuse or modify it.' }
New-Item -ItemType Directory -Path $root -Force | Out-Null
& $initdb.Source -D "$root\data" --auth-local=scram-sha-256 --auth-host=scram-sha-256
if ($LASTEXITCODE -ne 0) { throw 'initdb failed.' }
'nme-disposable-local-v1' | Set-Content -LiteralPath "$root\INSTANCE_ID" -NoNewline
Write-Output 'Disposable cluster initialized but not started. Configure TEST_DATABASE_URL for loopback and a nme_test_* database before tests.'
