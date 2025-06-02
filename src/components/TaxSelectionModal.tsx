'use client';

interface TaxSelectionModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
  onConfirmAction: (includeTax: boolean) => void;
}

export default function TaxSelectionModal({
  isOpen,
  onCloseAction,
  onConfirmAction,
}: TaxSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-96 rounded-lg bg-white p-6 shadow-xl">
        <h3 className="mb-4 text-lg font-bold">Configuración de Factura</h3>
        <div className="mb-6">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              onChange={(e) => onConfirmAction(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
            />
            <span>Incluir impuesto del 7%</span>
          </label>
        </div>
        <div className="flex justify-end gap-4">
          <button
            onClick={onCloseAction}
            className="rounded bg-gray-200 px-4 py-2 hover:bg-gray-300"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirmAction(false)}
            className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          >
            Continuar sin impuesto
          </button>
        </div>
      </div>
    </div>
  );
}
