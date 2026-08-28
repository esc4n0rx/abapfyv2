!macro customCheckAppRunning
  ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
  ${If} $R0 == 0
    ${If} ${Silent}
      SetErrorLevel 2
    ${Else}
      MessageBox MB_OK|MB_ICONSTOP "O Abapfy ainda está em execução.$\r$\n$\r$\nFeche todas as janelas e processos do Abapfy antes de continuar a instalação. Nenhum arquivo foi alterado."
    ${EndIf}
    Quit
  ${EndIf}
!macroend
