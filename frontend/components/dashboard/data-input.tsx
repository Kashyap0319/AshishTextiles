'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PackingProcessor } from './packing-processor'
import { BarcodeScanner } from './barcode-scanner'
import { OCRInput } from './ocr-input'
import { NotFoundStock } from './not-found-stock'

export function DataInput() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="barcode">
        <TabsList>
          <TabsTrigger value="barcode">Barcode Scanner</TabsTrigger>
          <TabsTrigger value="excel">Excel Upload</TabsTrigger>
          <TabsTrigger value="ocr">OCR / Photo</TabsTrigger>
          <TabsTrigger value="notfound">Not-Found Reconciliation</TabsTrigger>
        </TabsList>
        <TabsContent value="barcode"><BarcodeScanner /></TabsContent>
        <TabsContent value="excel"><PackingProcessor /></TabsContent>
        <TabsContent value="ocr"><OCRInput /></TabsContent>
        <TabsContent value="notfound"><NotFoundStock /></TabsContent>
      </Tabs>
    </div>
  )
}
