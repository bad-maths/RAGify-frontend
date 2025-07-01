"use client"

import { FileUploader } from "@/components/file-uploader"

export default function UploadPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload a file to get started</h1>
        <FileUploader />
      </div>
    </div>
  )
}