import { useState } from 'react';
import { Copy, Check, Key } from 'lucide-react';

interface CodigoInvitacionProps {
  codigo: string | null;
  localNombre: string;
}

export default function CodigoInvitacion({ codigo, localNombre }: CodigoInvitacionProps) {
  const [copiado, setCopiado] = useState(false);

  const copiarCodigo = () => {
    if (codigo) {
      navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  };

  if (!codigo) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4">
        <p className="text-yellow-200 text-sm">
          ⚠️ Este local no tiene código de invitación generado
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-3">
        <Key size={20} className="text-blue-400" />
        <h4 className="font-bold text-lg">Código de Invitación</h4>
      </div>
      
      <p className="text-sm text-gray-300 mb-4">
        Comparte este código con el propietario de <strong>{localNombre}</strong> para que pueda registrarse y gestionar su local.
      </p>

      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-800 rounded-lg p-4 border-2 border-blue-500">
          <p className="text-3xl font-mono font-bold text-center tracking-widest text-blue-300">
            {codigo}
          </p>
        </div>
        
        <button
          onClick={copiarCodigo}
          className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all flex items-center gap-2"
        >
          {copiado ? (
            <>
              <Check size={20} />
              <span className="font-medium">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy size={20} />
              <span className="font-medium">Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="mt-4 p-3 bg-gray-800/50 rounded border border-gray-700">
        <p className="text-xs text-gray-400">
          <strong>Instrucciones para el propietario:</strong><br/>
          1. Ir a la página de registro de propietarios<br/>
          2. Crear su cuenta con email y contraseña<br/>
          3. Ingresar este código de invitación<br/>
          4. ¡Listo! Podrá gestionar su local
        </p>
      </div>
    </div>
  );
}
