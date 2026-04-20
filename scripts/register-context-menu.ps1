param(
  [string]$ExePath = (Join-Path $PSScriptRoot "..\dist\win-unpacked\FilePeek AI.exe"),
  [switch]$Uninstall
)

$extensions = @(
  ".pdf",
  ".docx",
  ".xlsx",
  ".xls",
  ".txt",
  ".md",
  ".csv",
  ".zip",
  ".udf",
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp"
)

$menuLabel = "FilePeek AI ile A$([char]0x00E7)"

foreach ($extension in $extensions) {
  $keyPath = "HKCU\Software\Classes\SystemFileAssociations\$extension\shell\FilePeekAI"

  if ($Uninstall) {
    & reg.exe delete $keyPath /f 2>$null | Out-Null
    continue
  }

  $resolvedExe = Resolve-Path -LiteralPath $ExePath -ErrorAction Stop
  $commandPath = "$keyPath\command"
  $commandValue = "`"$($resolvedExe.Path)`" `"%1`""

  & reg.exe add $keyPath /ve /d $menuLabel /f | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to register $keyPath" }

  & reg.exe add $keyPath /v "Icon" /d "$($resolvedExe.Path),0" /f | Out-Null
  if ($LASTEXITCODE -ne 0) { throw "Failed to register icon for $keyPath" }

  New-Item -Path "Registry::$commandPath" -Force | Out-Null
  Set-Item -LiteralPath "Registry::$commandPath" -Value $commandValue
}

if ($Uninstall) {
  Write-Output "FilePeek AI context menu removed for current user."
} else {
  Write-Output "FilePeek AI context menu registered for current user: $((Resolve-Path -LiteralPath $ExePath).Path)"
}
