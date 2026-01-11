'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function DefineKPIForm({ agentId, onSuccess }: { agentId: string, onSuccess?: () => void }) {
  const [goal, setGoal] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [unit, setUnit] = useState('users')
  const [deadline, setDeadline] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/agents/strategic-planner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          action: 'define_kpis',
          data: {
            goal,
            targetValue: parseFloat(targetValue),
            unit,
            deadline
          }
        })
      })

      if (!res.ok) throw new Error('Failed to create KPI')

      setGoal('')
      setTargetValue('')
      setDeadline('')
      onSuccess?.()
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Define Business KPI</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Goal Name</Label>
            <Input value={goal} onChange={e => setGoal(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Target Value</Label>
              <Input type="number" value={targetValue} onChange={e => setTargetValue(e.target.value)} required />
            </div>
            <div>
              <Label>Unit</Label>
              <Input value={unit} onChange={e => setUnit(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating...' : 'Create KPI'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
