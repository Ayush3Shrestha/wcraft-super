"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { cn } from "../../lib/utils"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const FileUploader = React.forwardRef(({ 
  className, 
  value, 
  onValueChange, 
  dropzoneOptions, 
  children,
  ...props 
}, ref) => {
  const onDrop = React.useCallback((acceptedFiles) => {
    if (onValueChange) {
      onValueChange(acceptedFiles)
    }
  }, [onValueChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    ...dropzoneOptions
  })

  return (
    <div
      ref={ref}
      {...getRootProps()}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-6 transition-colors hover:border-gray-400",
        isDragActive && "border-blue-400 bg-blue-50",
        className
      )}
      {...props}
    >
      <input {...getInputProps()} />
      {children}
    </div>
  )
})
FileUploader.displayName = "FileUploader"

const FileInput = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("w-full", className)} {...props}>
      {children}
    </div>
  )
})
FileInput.displayName = "FileInput"

const FileUploaderContent = React.forwardRef(({ className, children, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("mt-4 space-y-2", className)} {...props}>
      {children}
    </div>
  )
})
FileUploaderContent.displayName = "FileUploaderContent"

const FileUploaderItem = React.forwardRef(({ 
  className, 
  children, 
  index,
  onRemove,
  ...props 
}, ref) => {
  return (
    <div 
      ref={ref} 
      className={cn(
        "flex items-center justify-between rounded-md border border-gray-200 p-2",
        className
      )}
      {...props}
    >
      <div className="flex items-center space-x-2">
        {children}
      </div>
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
})
FileUploaderItem.displayName = "FileUploaderItem"

export {
  FileUploader,
  FileInput,
  FileUploaderContent,
  FileUploaderItem,
}