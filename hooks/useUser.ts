"use client";

import { useEffect, useState } from "react";
import { AuthError, Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";


export function useUser(){
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<AuthError | null>(null);

    const supabase = createClient();
    
    useEffect(() => {
        const fetchSession = async () => {
            try{
                const { data : { session }, error } = await supabase.auth.getSession();

                if(error){
                    throw error;
                } else if(session){
                    setSession(session);
                    setUser(session.user);
                }

            } catch(err){
                setError(err as AuthError);
            }finally{
                setLoading(false);
            }

        }

        fetchSession();
    }, [supabase]);
    
    return { user:user, session:session, loading:loading, error:error };
}