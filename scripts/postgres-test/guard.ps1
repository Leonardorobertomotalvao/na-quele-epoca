param([string]$Url = $env:TEST_DATABASE_URL)
$ErrorActionPreference = 'Stop'
if (-not $Url) { throw 'TEST_DATABASE_URL is required; DATABASE_URL is never a fallback.' }
if (-not $env:TEST_DATABASE_INSTANCE_ID -or $env:TEST_DATABASE_INSTANCE_ID -ne 'nme-disposable-local-v1') {
  throw 'TEST_DATABASE_INSTANCE_ID must explicitly identify the disposable local cluster.'
}
try { $u = [Uri]$Url } catch { throw 'Invalid test database URL.' }
if ($u.Scheme -ne 'postgresql' -or $u.Host -notin @('127.0.0.1','localhost','::1')) { throw 'Only loopback PostgreSQL is allowed.' }
if ($u.AbsolutePath -notmatch '^/nme_test_[a-z0-9_]+$') { throw 'Database name must start with nme_test_.' }
$marker = 'E:\apps\postgres-test\INSTANCE_ID'
if (-not (Test-Path -LiteralPath $marker) -or (Get-Content -LiteralPath $marker -Raw).Trim() -ne $env:TEST_DATABASE_INSTANCE_ID) {
  throw 'Could not prove ownership of the disposable PostgreSQL instance in E:\apps.'
}
Write-Output "Test DB guard passed for $($u.Host)$($u.AbsolutePath); credentials omitted."
