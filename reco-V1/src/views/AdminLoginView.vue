<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const show = ref(false)

async function submit() {
	error.value = ''
	try {
		await auth.login(email.value, password.value)
		router.push({ name: 'admin' })
	} catch (e) {
		error.value = 'Email ou mot de passe incorrect'
	}
}
</script>

<template>
	<div class="main">
		<h1 class="main-title">Admin</h1>
		<UInput class="email-input" v-model="email" trailing-icon="i-lucide-at-sign" placeholder="Email" size="md"/>
		<UInput class="password-input" v-model="password" placeholder="Password" :type="show ? 'text' : 'password'" @keyup.enter="submit" />
		<div class="div-button">
			<UButton class="button-input" variant="outline" @click="submit">Go</UButton>
		</div>
		<p v-if="error">{{ error }}</p>
	</div>
</template>

<style scoped>
.main {
	display: grid;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}
.main-title {
    color: var(--ui-primary);
	margin-bottom: 0.5em;
	display: flex;
	justify-content: center;
}
.email-input {
	margin-bottom: 0.4em;
}
.password-input {
	margin-bottom: 1em;
}
.div-button {
	display: flex;
	align-items: center;
	justify-content: center;
}
.button-input {
	cursor: pointer;
	max-width: 50%;
}
</style>