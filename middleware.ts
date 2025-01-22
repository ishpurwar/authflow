import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Define routes
const loginPage = '/login'
const dashboardPage = '/' 
const emailConfirmationPage = '/email-confirmation'
const signupPage = '/signup'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/plasmic-host',
  '/email-confirmation'  // Keep this public for the redirect after signup
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
    error
  } = await supabase.auth.getUser()
  
  const currentPath = request.nextUrl.pathname

  // Handle new signup - redirect to email confirmation
  if (user && !user.email_confirmed_at && currentPath === signupPage) {
    const url = request.nextUrl.clone()
    url.pathname = emailConfirmationPage
    return NextResponse.redirect(url)
  }

  // Prevent confirmed users from accessing signup or email confirmation pages
  if (user?.email_confirmed_at && (currentPath === emailConfirmationPage || currentPath === signupPage || currentPath===loginPage)) {
    const url = request.nextUrl.clone()
    url.pathname = dashboardPage
    return NextResponse.redirect(url)
  }

  // Handle protected routes
  if (!user && !publicRoutes.includes(currentPath)) {
    const url = request.nextUrl.clone()
    url.pathname = loginPage
    url.searchParams.set('redirectTo', currentPath)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}