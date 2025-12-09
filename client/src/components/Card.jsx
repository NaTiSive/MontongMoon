export default function Card({children, className=""}){
    return(
        <div className={`bg-white shadow-sm rounded-xl p-5 border border-gray-200 ${className}`}>
            {children}
        </div>
    )
}