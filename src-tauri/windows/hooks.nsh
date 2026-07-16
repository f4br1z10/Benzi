!include "LogicLib.nsh"

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
