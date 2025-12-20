<template>
  <div class="transition-colors">
    <!-- Settlement row (clickable header) -->
    <button
      @click="toggleExpand"
      class="w-full px-3 py-3 flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left overflow-hidden"
      :class="{ 'bg-gray-50 dark:bg-gray-700/30': isExpanded }"
    >
      <!-- Chevron indicator -->
      <IconChevronRight
        class="w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0"
        :class="{ 'rotate-90': isExpanded }"
      />

      <!-- From user (debtor) -->
      <div class="min-w-0 max-w-[80px]">
        <UserAvatar
          :name="debtorName"
          :photo-url="null"
          size="sm"
          variant="negative"
          show-name
          first-name-only
        />
      </div>

      <!-- Arrow -->
      <div class="flex-shrink-0 text-gray-400">
        <IconArrowRight class="w-3 h-3" />
      </div>

      <!-- To user (creditor) -->
      <div class="min-w-0 max-w-[80px]">
        <UserAvatar
          :name="creditorName"
          :photo-url="null"
          size="sm"
          variant="positive"
          show-name
          first-name-only
        />
      </div>

      <!-- Amount -->
      <div class="ml-auto flex-shrink-0">
        <AmountDisplay
          :amount="settlement.amount"
          size="sm"
          bold
        />
      </div>
    </button>

    <!-- Expanded breakdown -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      enter-from-class="opacity-0 max-h-0"
      enter-to-class="opacity-100 max-h-[500px]"
      leave-active-class="transition-all duration-150 ease-in"
      leave-from-class="opacity-100 max-h-[500px]"
      leave-to-class="opacity-0 max-h-0"
    >
      <div
        v-if="isExpanded"
        class="px-4 pb-4 overflow-hidden"
      >
        <div class="ml-5 pl-4 border-l-2 border-gray-200 dark:border-gray-600 space-y-4">
          <!-- Expense breakdown -->
          <div>
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Desglose
            </p>
            <div class="space-y-2">
              <div
                v-for="(item, idx) in breakdown"
                :key="idx"
                class="flex items-center justify-between text-sm"
              >
                <div class="flex items-center gap-2 min-w-0">
                  <CategoryIcon :category="item.expense.category" size="sm" />
                  <span class="truncate text-gray-700 dark:text-gray-300">
                    {{ item.expense.description }}
                  </span>
                </div>
                <AmountDisplay
                  :amount="item.amount"
                  size="sm"
                  class="flex-shrink-0 ml-2"
                />
              </div>
              <div v-if="breakdown.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
                Sin desglose disponible
              </div>
            </div>
          </div>

          <!-- Payment info -->
          <div class="pt-3 border-t border-gray-200 dark:border-gray-600">
            <p class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <IconCreditCard class="w-4 h-4" />
              Datos de pago de {{ creditorFirstName }}
            </p>

            <div v-if="hasPaymentInfo" class="space-y-2">
              <!-- CBU -->
              <PaymentInfoRow
                v-if="creditor?.paymentInfo?.cbu"
                label="CBU"
                :value="creditor.paymentInfo.cbu"
                :field-key="`cbu-${index}`"
              />

              <!-- CVU -->
              <PaymentInfoRow
                v-if="creditor?.paymentInfo?.cvu"
                label="CVU"
                :value="creditor.paymentInfo.cvu"
                :field-key="`cvu-${index}`"
              />

              <!-- Alias -->
              <PaymentInfoRow
                v-if="creditor?.paymentInfo?.alias"
                label="Alias"
                :value="creditor.paymentInfo.alias"
                :field-key="`alias-${index}`"
                :mono="false"
              />

              <!-- Bank name -->
              <div v-if="creditor?.paymentInfo?.bankName" class="px-3 py-2">
                <p class="text-xs text-gray-500 dark:text-gray-400">Banco/Plataforma</p>
                <p class="text-sm text-gray-900 dark:text-white">
                  {{ creditor.paymentInfo.bankName }}
                </p>
              </div>
            </div>

            <!-- No payment info -->
            <div v-else class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2">
              <IconInformation class="w-4 h-4 flex-shrink-0" />
              <span>{{ creditorFirstName }} no agrego datos de pago aun</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import IconChevronRight from '~icons/mdi/chevron-right'
import IconArrowRight from '~icons/mdi/arrow-right'
import IconCreditCard from '~icons/mdi/credit-card'
import IconInformation from '~icons/mdi/information-outline'

import type { Settlement, Expense } from '~/types'

interface Props {
  settlement: Settlement
  index: number
}

const props = defineProps<Props>()

const userStore = useUserStore()
const expenseStore = useExpenseStore()
const isExpanded = ref(false)

const debtor = computed(() => userStore.getUserById(props.settlement.fromUserId))
const creditor = computed(() => userStore.getUserById(props.settlement.toUserId))

const debtorName = computed(() => debtor.value?.name || 'Usuario')
const creditorName = computed(() => creditor.value?.name || 'Usuario')
const creditorFirstName = computed(() => creditorName.value.split(' ')[0])

const hasPaymentInfo = computed(() => {
  const info = creditor.value?.paymentInfo
  if (!info) return false
  return !!(info.cbu || info.cvu || info.alias || info.bankName)
})

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value
}

// Calculate expense breakdown for a settlement
const breakdown = computed(() => {
  const result: Array<{ expense: Expense; amount: number }> = []

  expenseStore.expenses.forEach(expense => {
    // Only consider expenses paid by the creditor (toUserId)
    if (expense.userId !== props.settlement.toUserId) return

    // Determine who splits this expense
    let splitUserIds: string[] = []
    if (expense.splitAmong && expense.splitAmong.length > 0) {
      splitUserIds = expense.splitAmong.filter(id =>
        userStore.users.some(u => u.id === id)
      )
      if (splitUserIds.length === 0) {
        splitUserIds = userStore.users.map(u => u.id)
      } else if (!splitUserIds.includes(expense.userId)) {
        splitUserIds.push(expense.userId)
      }
    } else {
      splitUserIds = userStore.users.map(u => u.id)
    }

    // Check if debtor is in the split
    if (!splitUserIds.includes(props.settlement.fromUserId)) return

    const shareAmount = expense.amount / splitUserIds.length
    result.push({
      expense,
      amount: shareAmount
    })
  })

  return result.sort((a, b) =>
    new Date(b.expense.timestamp).getTime() - new Date(a.expense.timestamp).getTime()
  )
})
</script>
