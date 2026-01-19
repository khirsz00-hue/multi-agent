'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DollarSign, AlertTriangle } from 'lucide-react'
import { useState } from 'react'

interface BudgetTabProps {
  spaceId: string
  settings: any
}

export function BudgetTab({ spaceId, settings }: BudgetTabProps) {
  const [budget, setBudget] = useState(settings?.monthly_budget || 100)
  const [alertsEnabled, setAlertsEnabled] = useState(settings?.budget_alerts_enabled ?? true)
  const [saving, setSaving] = useState(false)

  const currentSpend = settings?.current_month_spend || 0
  const percentage = (currentSpend / budget) * 100

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/update-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId,
          monthlyBudget: budget,
          budgetAlertsEnabled: alertsEnabled
        })
      })

      if (res.ok) {
        alert('✅ Budżet zapisany!')
      }
    } catch (error) {
      alert('Błąd zapisu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-lg">Miesięczny Budżet</h3>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Limit miesięczny (PLN)</Label>
            <Input
              type="number"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Alerty o przekroczeniu budżetu</Label>
            <Switch
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Zapisywanie...' : 'Zapisz Ustawienia'}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Bieżące Wydatki</h3>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">W tym miesiącu:</span>
            <span className="font-semibold">${currentSpend.toFixed(2)} / ${budget.toFixed(2)}</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                percentage > 90 ? 'bg-red-600' : percentage > 70 ? 'bg-yellow-600' : 'bg-green-600'
              }`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>

          {percentage > 80 && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Zbliżasz się do limitu budżetu!</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
