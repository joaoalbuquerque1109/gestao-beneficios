/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useState } from 'react'
import { X, AlertCircle, Info } from 'lucide-react'

interface StatusRulesModalProps {
  isOpen: boolean
  status?: any
  onClose: () => void
  onSave: (data: any) => Promise<void>
  isLoading: boolean
}

export default function StatusRulesModal({ isOpen, status, onClose, onSave, isLoading }: StatusRulesModalProps) {
  const [formData, setFormData] = useState({
    name: status?.name || '',
    description: status?.description || '',
    includesVACalculation: status?.includes_va_calculation !== false,
    includesBasketCalculation: status?.includes_basket_calculation !== false,
    exclusionType: status?.exclusion_type || 'NENHUMA', // 'NENHUMA', 'TOTAL', 'PARTIAL'
    exclusionPercentage: status?.exclusion_percentage || 0,
    startDate: status?.start_date || '',
    endDate: status?.end_date || ''
  })

  const [errors, setErrors] = useState<string[]>([])

  const handleValidate = () => {
    const newErrors: string[] = []

    if (!formData.name.trim()) {
      newErrors.push('Nome do status é obrigatório')
    }

    if (formData.exclusionType === 'PARTIAL') {
      if (formData.exclusionPercentage < 0 || formData.exclusionPercentage > 100) {
        newErrors.push('Porcentagem de exclusão deve estar entre 0 e 100')
      }
      if (formData.exclusionPercentage === 0) {
        newErrors.push('Para exclusão parcial, defina uma porcentagem maior que 0')
      }
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        newErrors.push('Data de início não pode ser maior que data de fim')
      }
    }

    setErrors(newErrors)
    return newErrors.length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!handleValidate()) {
      return
    }

    await onSave({
      name: formData.name.toUpperCase(),
      description: formData.description,
      includes_va_calculation: formData.includesVACalculation,
      includes_basket_calculation: formData.includesBasketCalculation,
      exclusion_type: formData.exclusionType === 'NENHUMA' ? null : formData.exclusionType,
      exclusion_percentage: formData.exclusionType === 'PARTIAL' ? formData.exclusionPercentage : 0,
      start_date: formData.startDate || null,
      end_date: formData.endDate || null
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-bold text-slate-900 text-lg">
            {status ? 'Editar Regras de Status' : 'Criar Novo Status'}
          </h3>
          <button onClick={onClose} disabled={isLoading}>
            <X size={24} className="text-slate-400 hover:text-slate-600 transition" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          
          {/* Errors */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-2 items-start">
                <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-red-900 text-sm mb-1">Erros encontrados:</h4>
                  <ul className="text-sm text-red-800 space-y-1">
                    {errors.map((error, idx) => (
                      <li key={idx} className="flex items-center gap-1">• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Info size={16} className="text-blue-600" />
              Informações Básicas
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                  Nome do Status *
                </label>
                <input
                  type="text"
                  required
                  className="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="Ex: AFASTADO INSS"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isLoading || !!status}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                  Descrição
                </label>
                <input
                  type="text"
                  className="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrição opcional..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Benefits Calculation Rules */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="font-bold text-slate-900 text-sm">Inclusão em Cálculo de Benefícios</h4>
            
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg border border-blue-100 hover:bg-blue-50 transition">
                <input
                  type="checkbox"
                  checked={formData.includesVACalculation}
                  onChange={(e) => setFormData({ ...formData, includesVACalculation: e.target.checked })}
                  disabled={isLoading}
                  className="w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-slate-700 text-sm">Vale Alimentação</div>
                  <div className="text-xs text-slate-500">Incluir no cálculo do VA</div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-white rounded-lg border border-blue-100 hover:bg-blue-50 transition">
                <input
                  type="checkbox"
                  checked={formData.includesBasketCalculation}
                  onChange={(e) => setFormData({ ...formData, includesBasketCalculation: e.target.checked })}
                  disabled={isLoading}
                  className="w-4 h-4 cursor-pointer"
                />
                <div>
                  <div className="font-semibold text-slate-700 text-sm">Cesta Básica</div>
                  <div className="text-xs text-slate-500">Incluir no cálculo da cesta</div>
                </div>
              </label>
            </div>
          </div>

          {/* Exclusion Rules */}
          <div className="space-y-4 p-4 bg-orange-50 rounded-lg border border-orange-100">
            <h4 className="font-bold text-slate-900 text-sm">Tipo de Exclusão (Opcional)</h4>
            
            <div className="space-y-3">
              {[
                { value: 'NENHUMA', label: 'Sem Exclusão', description: 'Status normal, sem restrições' },
                { value: 'TOTAL', label: 'Exclusão Total', description: 'Exclui completamente do cálculo de benefícios' },
                { value: 'PARTIAL', label: 'Exclusão Parcial', description: 'Reduz o cálculo em uma porcentagem' }
              ].map((option) => (
                <label key={option.value} className="flex items-start gap-3 cursor-pointer p-3 bg-white rounded-lg border border-orange-100 hover:bg-orange-50 transition">
                  <input
                    type="radio"
                    name="exclusionType"
                    value={option.value}
                    checked={formData.exclusionType === option.value}
                    onChange={(e) => setFormData({ ...formData, exclusionType: e.target.value })}
                    disabled={isLoading}
                    className="w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-slate-700 text-sm">{option.label}</div>
                    <div className="text-xs text-slate-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>

            {/* Exclusion Percentage */}
            {formData.exclusionType === 'PARTIAL' && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2 uppercase">
                  Porcentagem de Exclusão (%)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={formData.exclusionPercentage}
                    onChange={(e) => setFormData({ ...formData, exclusionPercentage: Number(e.target.value) })}
                    disabled={isLoading}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-lg font-bold text-orange-600 w-12 text-center">
                    {formData.exclusionPercentage}%
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Benefícios serão reduzidos em {formData.exclusionPercentage}% quando este status for aplicado
                </p>
              </div>
            )}
          </div>

          {/* Period (Optional) */}
          <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-100">
            <h4 className="font-bold text-slate-900 text-sm">Período de Validade (Opcional)</h4>
            <p className="text-xs text-slate-600">
              Se preenchido, este status será automaticamente desativado após a data de fim
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Data Início</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">Data Fim</label>
                <input
                  type="date"
                  className="w-full border border-slate-300 p-2.5 rounded-lg bg-white outline-none focus:ring-2 focus:ring-green-500"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm mb-3">Resumo das Regras</h4>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between">
                <span>VA:</span>
                <span className="font-semibold">{formData.includesVACalculation ? '✓ Incluído' : '✗ Excluído'}</span>
              </div>
              <div className="flex justify-between">
                <span>Cesta Básica:</span>
                <span className="font-semibold">{formData.includesBasketCalculation ? '✓ Incluída' : '✗ Excluída'}</span>
              </div>
              <div className="flex justify-between">
                <span>Tipo de Exclusão:</span>
                <span className="font-semibold">{formData.exclusionType === 'PARTIAL' ? `${formData.exclusionPercentage}%` : formData.exclusionType}</span>
              </div>
              {(formData.startDate || formData.endDate) && (
                <div className="flex justify-between">
                  <span>Período:</span>
                  <span className="font-semibold">{formData.startDate} até {formData.endDate || 'indefinido'}</span>
                </div>
              )}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? '⏳ Salvando...' : '✓ Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
