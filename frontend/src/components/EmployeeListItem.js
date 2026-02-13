import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import './EmployeeListItem.css'; 

const EmployeeListItem = ({ employee, onShowDetails }) => {
    const itemVariants = { hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } };
    return (
        <motion.div
            className="list-item" variants={itemVariants} exit={{ opacity: 0, x: -20 }} layout
            onClick={onShowDetails} whileHover={{ backgroundColor: "var(--surface-secondary)" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}>
            <div className="item-info">
                <img src={employee.photo || `https://ui-avatars.com/api/?name=${employee.firstName}+${employee.lastName}&background=007aff&color=fff&rounded=true&size=44`}
                    alt={`${employee.firstName} ${employee.lastName}`} className="item-photo" />
                <div className="item-details">
                    <p className="item-name">{`${employee.firstName} ${employee.lastName}`}</p>
                    <p className="item-contact">{employee.email}</p>
                </div>
            </div>
            <ChevronRight size={20} className="item-chevron" />
        </motion.div>
    );
};
export default EmployeeListItem;