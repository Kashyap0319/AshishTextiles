'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { CheckCircle2, Circle, Clock, Plus, Loader2, XCircle } from 'lucide-react'
import api from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

interface Task {
  id: number
  description: string
  assigned_to_name: string
  assigned_by_name: string
  status: string
  priority: string
  notes?: string
  created_at: string
  completed_at?: string
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [newTask, setNewTask] = useState('')
  const [newPriority, setNewPriority] = useState('normal')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks/')
      setTasks(Array.isArray(res.data) ? res.data : res.data?.items || [])
    } catch {
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTasks() }, [])

  const addTask = async () => {
    if (!newTask.trim()) return
    setAdding(true)
    try {
      await api.post('/tasks/', { description: newTask, priority: newPriority })
      setNewTask('')
      fetchTasks()
    } catch {} finally { setAdding(false) }
  }

  const completeTask = async (id: number) => {
    try {
      await api.put(`/tasks/${id}/complete`)
      fetchTasks()
    } catch {}
  }

  const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter)

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="size-4 text-emerald-400" />
    if (status === 'rejected') return <XCircle className="size-4 text-red-400" />
    return <Circle className="size-4 text-muted-foreground" />
  }

  const priorityColor = (p: string) => {
    if (p === 'urgent') return 'border-red-500/30 text-red-400'
    if (p === 'high') return 'border-amber-500/30 text-amber-400'
    return 'border-border text-muted-foreground'
  }

  return (
    <div className="space-y-6">
      {/* Add Task */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Input placeholder="New task description..." value={newTask} onChange={(e) => setNewTask(e.target.value)} className="flex-1" onKeyDown={(e) => e.key === 'Enter' && addTask()} />
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={addTask} disabled={adding}>
              {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'pending', 'completed', 'rejected'].map((f) => (
          <Button key={f} size="sm" variant={filter === f ? 'default' : 'outline'} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="space-y-2">
          {filtered.map((task) => (
            <motion.div key={task.id} variants={staggerItem}>
              <Card>
                <CardContent className="p-4 flex items-center gap-4">
                  <button onClick={() => task.status === 'pending' && completeTask(task.id)} className="shrink-0">
                    {statusIcon(task.status)}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                      {task.description}
                    </p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      {task.assigned_to_name && <span>Assigned to: {task.assigned_to_name}</span>}
                      <span>{new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={priorityColor(task.priority)}>{task.priority}</Badge>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          {filtered.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No tasks found</CardContent></Card>
          )}
        </motion.div>
      )}
    </div>
  )
}
