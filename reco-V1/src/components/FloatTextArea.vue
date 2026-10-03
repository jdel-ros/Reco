<script setup>
defineProps({ label: String })
const model = defineModel()
</script>

<template>
    <UTextarea v-model="model" placeholder=" " :ui="{ base: 'peer' }" :rows="6">
        <label
            class="pointer-events-none absolute left-2 -top-2.5 text-xs transition-all
                   peer-placeholder-shown:top-2 peer-placeholder-shown:text-sm peer-placeholder-shown:text-dimmed
                   peer-focus:-top-2.5 peer-focus:text-xs peer-focus:text-highlighted"
        >
            <span class="bg-default px-1">{{ label }}</span>
        </label>
    </UTextarea>
</template>