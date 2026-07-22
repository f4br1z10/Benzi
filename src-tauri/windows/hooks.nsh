!include "LogicLib.nsh"

!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Chiusura della versione precedente..."
  nsExec::ExecToLog 'powershell.exe -NoProfile -WindowStyle Hidden -Command "Get-Process node -ErrorAction SilentlyContinue | Where-Object Path -eq ''$INSTDIR\resources\runtime\node.exe'' | Stop-Process -Force"'
  nsExec::ExecToLog 'powershell.exe -NoProfile -WindowStyle Hidden -Command "Get-Process gestione-preventivi -ErrorAction SilentlyContinue | Where-Object Path -eq ''$INSTDIR\gestione-preventivi.exe'' | Stop-Process -Force"'
  Sleep 500
!macroend

!macro NSIS_HOOK_POSTINSTALL
  SetRegView 64
  ReadRegDWord $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    DetailPrint "Installazione Microsoft Visual C++ Redistributable..."
    ExecWait '"$INSTDIR\resources\vc_redist.x64.exe" /install /quiet /norestart' $1
    ${If} $1 != 0
      DetailPrint "Visual C++ Redistributable ha restituito il codice $1."
    ${EndIf}
  ${EndIf}
!macroend
