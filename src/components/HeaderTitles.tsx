export default function HeaderTitles() {
  const tableHeaders = [
    'Hora Inicial',
    'Propiedad',
    'Cliente',
    'Valor del Servicio',
    'Tiempo del Servicio',
    'Empleado',
    'Horas',
    'Hora Final',
  ];

  return (
    <thead className="sticky-header">
      <tr className="bg-gray-50">
        {tableHeaders.map((header) => (
          <th
            key={header}
            scope="col"
            className="table-header relative border-r border-b border-gray-400 bg-white whitespace-nowrap"
          >
            {header}
          </th>
        ))}
      </tr>
    </thead>
  );
}
