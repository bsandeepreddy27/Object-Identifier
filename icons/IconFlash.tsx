import React from 'react';

export const IconFlash: React.FC<React.SVGProps<SVGSVGElement> & { on: boolean }> = ({ on, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        {on ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.412 15.655L9.75 21.75l3.745-4.012M9.255 9.755L3.75 13.5h7.5l3.156-3.368m0 0L21.75 3 12 10.5M12.941 6.368L21.75 3l-3.156 3.368m0 0L3 21.75" />
        )}
    </svg>
);
