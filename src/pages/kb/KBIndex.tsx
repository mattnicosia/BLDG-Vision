import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CompanyTab } from './CompanyTab'
import { ProjectsTab } from './ProjectsTab'
import { VETab } from './VETab'
import { MaterialsTab } from './MaterialsTab'

export function KBIndex() {
  const [tab, setTab] = useState('company')

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-medium">Knowledge Base</h1>
        <p className="text-sm text-muted-foreground">
          This trains the AI on your firm. The more you add, the better the output.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="ve">VE Cases</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanyTab />
        </TabsContent>
        <TabsContent value="projects" className="mt-4">
          <ProjectsTab />
        </TabsContent>
        <TabsContent value="ve" className="mt-4">
          <VETab />
        </TabsContent>
        <TabsContent value="materials" className="mt-4">
          <MaterialsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
