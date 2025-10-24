import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";


export async function updateSession(req:NextRequest) {
    let supabaseResponse = NextResponse.next({ request : req });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                //Reads cookies from the request
                getAll : () =>  req.cookies.getAll(),

                //Sets cookies to the response
                setAll : (cookiesToSet) => {
                    // Mutating the request cookies so the rest of the middleware
                    // and the actual route has access to the updated cookies.
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set(name, value);
                    });

                    // Creating a new response so we can set the cookies [Recreated because of request mutation]
                    supabaseResponse = NextResponse.next({ request : req });

                    // Setting cookies to the response
                    cookiesToSet.forEach(({ name, value, options }) => {
                        supabaseResponse.cookies.set(name, value, options);
                    });

                },
            },
        },
    );

    // This part will trigger the refresh of the access token if it's needed [Only if refresh token is valid and access token is expired]
    const {data : {user}} = await supabase.auth.getUser();

    const currentPath = req.nextUrl.pathname;
    const currentSearch = req.nextUrl.search || '';
    const fullPath = `${currentPath}${currentSearch}`;

    // If unauthenticated and path isn't public, redirect to login with next=...
    const isPublic = (
      currentPath.startsWith('/login') ||
      currentPath.startsWith('/auth') // includes /auth/callback and /auth/auth-code-error
    );

    if (!user && !isPublic) {
      const url = req.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', fullPath);
      return NextResponse.redirect(url);
    }

    // If already authenticated, avoid showing the login page
    if (user && currentPath.startsWith('/login')){
        const url = req.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;

}
