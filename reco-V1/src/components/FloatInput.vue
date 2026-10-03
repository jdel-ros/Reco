<script setup>
defineProps({ label: String })
const model = defineModel()
</script>

<template>
    <UInput v-model="model" placeholder=" " :ui="{ base: 'peer' }">
        <label
            class="pointer-events-none absolute left-2 -top-2.5 text-xs transition-all
                   peer-placeholder-shown:top-1.5 peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed
                   peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-highlighted"
        >
            <span class="bg-default px-1">{{ label }}</span>
        </label>
    </UInput>
</template>