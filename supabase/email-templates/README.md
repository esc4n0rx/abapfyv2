# Recuperação de senha por código

O aplicativo chama `resetPasswordForEmail`, valida o código com `verifyOtp` (`type: 'recovery'`) e define a nova senha com `updateUser`. O código é gerado pelo Supabase; o Resend atua apenas como serviço de entrega via SMTP.

## Configuração no projeto Supabase

1. Em **Authentication > Email Templates > Reset password**, defina o assunto como `Código para redefinir sua senha | GeoSystem - Abapfy` e cole o conteúdo de [`recovery.html`](./recovery.html).
2. Em **Authentication > SMTP Settings**, configure o SMTP do Resend com um domínio remetente verificado. Guarde as credenciais no Supabase, nunca nas variáveis `VITE_*` ou no aplicativo Electron.
3. Confira o limite de envio e a expiração do OTP nas configurações de Auth. A interface aguarda 60 segundos antes de permitir novo envio.
4. Envie um e-mail de teste para uma conta de teste com `nome` e `empresa` preenchidos e outra conta sem esses metadados. Valide o código, a troca de senha e o login com a senha nova.

O cadastro atual salva `nome` e `empresa` em `user_metadata`; o template os apresenta quando disponíveis. Usuários antigos sem esses metadados recebem uma saudação genérica. A resposta do app à solicitação de código não revela se o endereço possui uma conta.

O HTML deste diretório é a fonte versionada do template. Alterá-lo localmente não altera o e-mail em produção até que seja aplicado no painel do Supabase.
