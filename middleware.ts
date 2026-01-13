import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Configuração inicial da resposta e do cliente Supabase
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Verificar Sessão
  // getUser é mais seguro que getSession para middleware
  const { data: { user } } = await supabase.auth.getUser()

  // Se não estiver logado e tentar acessar qualquer coisa que não seja login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Se estiver logado e tentar acessar login, manda pra home
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Se não tiver usuário (caso de assets, api, etc, ou não logado no login), libera
  if (!user) {
    return response
  }

  // 3. Verificação de Role (Permissões)
  // Como sua role está no banco, precisamos buscar.
  // Nota: Em apps muito grandes, idealmente a role estaria no metadata do token JWT para evitar esse fetch.
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .ilike('email', user.email!)
    .single()

  const userRole = profile?.role || 'USER' // Default para USER se não achar
  const path = request.nextUrl.pathname

  // === REGRAS DE SEGURANÇA ===

  // A. Rotas exclusivas de ADMIN
  // Inclui: Auditoria, Configurações, Ajustes, Gestão de Usuários
  const adminRoutes = ['/audit', '/settings', '/adjustments']
  const isTryingAdminRoute = adminRoutes.some(route => path.startsWith(route))

  if (isTryingAdminRoute && userRole !== 'ADMIN') {
    // Redireciona para home se tentar acessar sem ser admin
    return NextResponse.redirect(new URL('/', request.url))
  }

  // B. Rotas de RH e ADMIN (Operacionais)
  // Inclui: Apuração, Aprovação, Movimentações
  const rhRoutes = ['/calculation', '/approval', '/movements']
  const isTryingRhRoute = rhRoutes.some(route => path.startsWith(route))

  if (isTryingRhRoute) {
    // Se NÃO for ADMIN e NÃO for RH (ou seja, se for USER), bloqueia
    if (userRole !== 'ADMIN' && userRole !== 'RH') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // C. Rotas Públicas para Logados (Resumo, Funcionários, Faltas)
  // Nenhuma verificação extra necessária, pois já verificamos se user existe no passo 2.

  return response
}

export const config = {
  // O matcher define em quais rotas o middleware roda.
  // Excluímos _next/static, imagens, favicon, etc.
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}