'use client'

import { useCallback } from 'react'
import { ArticleEditor } from './ArticleEditor'

interface ServiceArticleEditorProps {
  serviceId: string
  initialJson: unknown | null
  saveAction: (formData: FormData) => Promise<void>
}

export function ServiceArticleEditor({ serviceId, initialJson, saveAction }: ServiceArticleEditorProps) {
  const handleSave = useCallback(
    async (articleJson: string, articleText: string) => {
      const fd = new FormData()
      fd.set('serviceId', serviceId)
      fd.set('articleJson', articleJson)
      fd.set('articleText', articleText)
      await saveAction(fd)
    },
    [serviceId, saveAction],
  )

  return (
    <ArticleEditor
      serviceId={serviceId}
      initialJson={initialJson}
      onSave={handleSave}
    />
  )
}
