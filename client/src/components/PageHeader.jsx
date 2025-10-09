export default function PageHeader({title="หัวข้อหน้า", subtitle="รายละเอียดหน้า"}){
    return(
        <div className="p-7">
            <div className="mb-6">
                <h1 className="text-3xl font-semibold text-gray-800">{title}</h1>
                <p className="text-sm mt-1 text-gray-600">{subtitle}</p>
            </div>
        </div>
    );
}