import { ref } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '@/lib/supabase'

export const useAuthStore = defineStore('auth', () => {
    const user = ref(null)
    const ready = ref(false)

    async function init() {
        const { data } = await supabase.auth.getSession()
        user.value = data.session?.user ?? null
        ready.value = true
        supabase.auth.onAuthStateChange((_event, session) => {
            user.value = session?.user ?? null
        })
    }

    async function login(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }

    async function logout() {
        await supabase.auth.signOut()
    }

    return { user, ready, init, login, logout }
})
