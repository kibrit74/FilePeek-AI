!macro RegisterFilePeekContextMenu EXT
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\FilePeekAI" "" "FilePeek AI ile Aç"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\FilePeekAI" "Icon" "$INSTDIR\FilePeek AI.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\FilePeekAI\command" "" '"$INSTDIR\FilePeek AI.exe" "%1"'
!macroend

!macro UnregisterFilePeekContextMenu EXT
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\${EXT}\shell\FilePeekAI"
!macroend

!macro customInstall
  DetailPrint "Registering FilePeek AI explorer context menu"
  !insertmacro RegisterFilePeekContextMenu ".pdf"
  !insertmacro RegisterFilePeekContextMenu ".docx"
  !insertmacro RegisterFilePeekContextMenu ".xlsx"
  !insertmacro RegisterFilePeekContextMenu ".xls"
  !insertmacro RegisterFilePeekContextMenu ".txt"
  !insertmacro RegisterFilePeekContextMenu ".md"
  !insertmacro RegisterFilePeekContextMenu ".csv"
  !insertmacro RegisterFilePeekContextMenu ".zip"
  !insertmacro RegisterFilePeekContextMenu ".udf"
  !insertmacro RegisterFilePeekContextMenu ".jpg"
  !insertmacro RegisterFilePeekContextMenu ".jpeg"
  !insertmacro RegisterFilePeekContextMenu ".png"
  !insertmacro RegisterFilePeekContextMenu ".gif"
  !insertmacro RegisterFilePeekContextMenu ".webp"
  !insertmacro RegisterFilePeekContextMenu ".bmp"
!macroend

!macro customUnInstall
  DetailPrint "Removing FilePeek AI explorer context menu"
  !insertmacro UnregisterFilePeekContextMenu ".pdf"
  !insertmacro UnregisterFilePeekContextMenu ".docx"
  !insertmacro UnregisterFilePeekContextMenu ".xlsx"
  !insertmacro UnregisterFilePeekContextMenu ".xls"
  !insertmacro UnregisterFilePeekContextMenu ".txt"
  !insertmacro UnregisterFilePeekContextMenu ".md"
  !insertmacro UnregisterFilePeekContextMenu ".csv"
  !insertmacro UnregisterFilePeekContextMenu ".zip"
  !insertmacro UnregisterFilePeekContextMenu ".udf"
  !insertmacro UnregisterFilePeekContextMenu ".jpg"
  !insertmacro UnregisterFilePeekContextMenu ".jpeg"
  !insertmacro UnregisterFilePeekContextMenu ".png"
  !insertmacro UnregisterFilePeekContextMenu ".gif"
  !insertmacro UnregisterFilePeekContextMenu ".webp"
  !insertmacro UnregisterFilePeekContextMenu ".bmp"
!macroend
