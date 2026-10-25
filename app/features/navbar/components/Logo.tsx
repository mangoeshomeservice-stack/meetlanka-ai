import React from 'react';
import styled from 'styled-components';

const Mark = styled.div`
    align-items: center;
    background: linear-gradient(135deg, #3b82f6, #0ea5e9);
    border-radius: 13px;
    box-shadow: 0 6px 18px rgba(37, 99, 235, 0.35);
    color: #fff;
    display: flex;
    font-size: 15px;
    font-weight: 900;
    height: 40px;
    justify-content: center;
    letter-spacing: -1px;
    width: 40px;
`;

/** Branded navigation mark for MEET UP. */
export default function Logo() {
    return <Mark title = 'MEET UP'>MU</Mark>;
}
