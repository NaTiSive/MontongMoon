import "./Sidebar.css"
import { MdDashboard } from "react-icons/md";
import { IoPricetag } from "react-icons/io5";
import { RiTreeFill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa";
import { AiFillDollarCircle } from "react-icons/ai";
import { IoWarning } from "react-icons/io5";
import { LuListTodo } from "react-icons/lu";


export default function Sidebar(){

  const menu = [
    { id: "dashboard", name: "แดชบอร์ด", icon: <MdDashboard /> },
    { id: "suggestion", name: "ข้อเสนอ", icon: <IoPricetag /> },
    { id: "durian", name: "สถานะต้นทุเรียน", icon: <RiTreeFill /> },
    { id: "harvest", name: "ผลการเก็บเกี่ยว", icon: <FaClipboardList /> },
    { id: "income", name: "รายรับรายจ่าย", icon: <AiFillDollarCircle /> },
    { id: "issues", name: "ปัญหา", icon: <IoWarning /> },
    { id: "activity", name: "กิจกรรม", icon: <LuListTodo /> },
  ];

    return(
    <>
        <div>
            <MdDashboard />
            <IoPricetag />
            <RiTreeFill />
            <FaClipboardList />
            <AiFillDollarCircle />
            <IoWarning />
            <LuListTodo />
        </div>
    </>
    )
}