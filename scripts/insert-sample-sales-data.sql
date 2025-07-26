-- Script to add sample sales data to an existing business
-- Run this after you have created at least one business in your system

-- First, let's check if we have any businesses
DO $$
DECLARE
    business_count INTEGER;
    sample_business_id UUID;
    business_name TEXT;
BEGIN
    -- Count businesses
    SELECT COUNT(*) INTO business_count FROM public.businesses;
    
    IF business_count = 0 THEN
        RAISE NOTICE 'No businesses found. Please create a business first using the application.';
        RAISE NOTICE 'Go to your application -> Settings -> Business Setup to create a business.';
    ELSE
        -- Get the first business
        SELECT id, name INTO sample_business_id, business_name 
        FROM public.businesses 
        ORDER BY created_at ASC 
        LIMIT 1;
        
        RAISE NOTICE 'Found % businesses. Using business: % (ID: %)', business_count, business_name, sample_business_id;
        
        -- Check if sample data already exists
        IF EXISTS (SELECT 1 FROM public.invoices WHERE business_id = sample_business_id AND invoice_no LIKE 'INV-2025-%') THEN
            RAISE NOTICE 'Sample data already exists for this business. Skipping insertion.';
        ELSE
            -- Insert sample sales data
            INSERT INTO public.invoices (
              business_id, invoice_no, date, party_name, gstin, state, address, 
              items, subtotal, total_tax, round_off, net_total, payment_received, 
              balance_due, type, status, due_date, payment_method
            ) VALUES 
            (
              sample_business_id,
              'INV-2025-001',
              CURRENT_DATE - INTERVAL '10 days',
              'ABC Corporation',
              '29ABCDE1234F1Z5',
              'Karnataka',
              '123 Business Park, Bangalore, Karnataka 560001',
              '[{"item": "Product A", "qty": 5, "rate": 2000, "amount": 10000, "gst": 18}]',
              10000.00,
              1800.00,
              0.00,
              11800.00,
              11800.00,
              0.00,
              'sales',
              'paid',
              CURRENT_DATE + INTERVAL '20 days',
              'UPI'
            ),
            (
              sample_business_id,
              'INV-2025-002',
              CURRENT_DATE - INTERVAL '8 days',
              'XYZ Limited',
              '27XYZAB5678C2D9',
              'Maharashtra',
              '456 Trade Center, Mumbai, Maharashtra 400001',
              '[{"item": "Product B", "qty": 10, "rate": 2500, "amount": 25000, "gst": 18}]',
              25000.00,
              4500.00,
              0.00,
              29500.00,
              0.00,
              29500.00,
              'sales',
              'pending',
              CURRENT_DATE + INTERVAL '22 days',
              'Bank Transfer'
            ),
            (
              sample_business_id,
              'INV-2025-003',
              CURRENT_DATE - INTERVAL '5 days',
              'PQR Industries',
              '33PQRST9012E3F4',
              'Tamil Nadu',
              '789 Industrial Area, Chennai, Tamil Nadu 600001',
              '[{"item": "Product C", "qty": 3, "rate": 5000, "amount": 15000, "gst": 18}]',
              15000.00,
              2700.00,
              0.00,
              17700.00,
              17700.00,
              0.00,
              'sales',
              'paid',
              CURRENT_DATE + INTERVAL '25 days',
              'Cash'
            ),
            (
              sample_business_id,
              'INV-2025-004',
              CURRENT_DATE - INTERVAL '3 days',
              'TechSoft Solutions',
              '07TECHQ9876R1Z8',
              'Delhi',
              '45 Tech Hub, New Delhi, Delhi 110001',
              '[{"item": "Software License", "qty": 1, "rate": 50000, "amount": 50000, "gst": 18}]',
              50000.00,
              9000.00,
              0.00,
              59000.00,
              30000.00,
              29000.00,
              'sales',
              'partial',
              CURRENT_DATE + INTERVAL '27 days',
              'Bank Transfer'
            ),
            (
              sample_business_id,
              'INV-2025-005',
              CURRENT_DATE - INTERVAL '1 day',
              'Global Enterprises',
              '19GLOBAL123A1Z9',
              'Gujarat',
              '88 Business District, Ahmedabad, Gujarat 380001',
              '[{"item": "Consulting Services", "qty": 20, "rate": 1500, "amount": 30000, "gst": 18}]',
              30000.00,
              5400.00,
              0.00,
              35400.00,
              35400.00,
              0.00,
              'sales',
              'paid',
              CURRENT_DATE + INTERVAL '29 days',
              'UPI'
            ),
            (
              sample_business_id,
              'INV-2025-006',
              CURRENT_DATE,
              'Modern Industries',
              '22MODERN567B2C1',
              'Karnataka',
              '12 Industrial Zone, Bangalore, Karnataka 560078',
              '[{"item": "Equipment", "qty": 2, "rate": 12000, "amount": 24000, "gst": 18}]',
              24000.00,
              4320.00,
              0.00,
              28320.00,
              0.00,
              28320.00,
              'sales',
              'pending',
              CURRENT_DATE + INTERVAL '30 days',
              'Cash'
            ),
            (
              sample_business_id,
              'INV-2025-007',
              CURRENT_DATE - INTERVAL '15 days',
              'Smart Solutions Ltd',
              '10SMART789C3D2',
              'Karnataka',
              '99 Tech Park, Bangalore, Karnataka 560001',
              '[{"item": "Mobile App Development", "qty": 1, "rate": 80000, "amount": 80000, "gst": 18}]',
              80000.00,
              14400.00,
              0.00,
              94400.00,
              0.00,
              94400.00,
              'sales',
              'overdue',
              CURRENT_DATE - INTERVAL '1 day',
              'Bank Transfer'
            );
            
            RAISE NOTICE 'Successfully inserted 7 sample sales invoices for business: %', business_name;
            RAISE NOTICE 'You can now view the sales data in your application at /sales';
        END IF;
    END IF;
END $$;

-- Also create some sample parties that match our invoice data
DO $$
DECLARE
    sample_business_id UUID;
    party_count INTEGER;
BEGIN
    -- Get the first business
    SELECT id INTO sample_business_id FROM public.businesses ORDER BY created_at ASC LIMIT 1;
    
    IF sample_business_id IS NOT NULL THEN
        -- Check if parties already exist
        SELECT COUNT(*) INTO party_count FROM public.parties WHERE business_id = sample_business_id;
        
        IF party_count = 0 THEN
            INSERT INTO public.parties (
                business_id, name, mobile, email, type, address, city, state, pincode, gstin
            ) VALUES 
            (sample_business_id, 'ABC Corporation', '+91-9876543210', 'contact@abccorp.com', 'Debtor', '123 Business Park', 'Bangalore', 'Karnataka', '560001', '29ABCDE1234F1Z5'),
            (sample_business_id, 'XYZ Limited', '+91-9876543211', 'info@xyzltd.com', 'Debtor', '456 Trade Center', 'Mumbai', 'Maharashtra', '400001', '27XYZAB5678C2D9'),
            (sample_business_id, 'PQR Industries', '+91-9876543212', 'sales@pqrind.com', 'Debtor', '789 Industrial Area', 'Chennai', 'Tamil Nadu', '600001', '33PQRST9012E3F4'),
            (sample_business_id, 'TechSoft Solutions', '+91-9876543213', 'hello@techsoft.com', 'Debtor', '45 Tech Hub', 'New Delhi', 'Delhi', '110001', '07TECHQ9876R1Z8'),
            (sample_business_id, 'Global Enterprises', '+91-9876543214', 'contact@global.com', 'Debtor', '88 Business District', 'Ahmedabad', 'Gujarat', '380001', '19GLOBAL123A1Z9'),
            (sample_business_id, 'Modern Industries', '+91-9876543215', 'info@modern.com', 'Debtor', '12 Industrial Zone', 'Bangalore', 'Karnataka', '560078', '22MODERN567B2C1'),
            (sample_business_id, 'Smart Solutions Ltd', '+91-9876543216', 'team@smart.com', 'Debtor', '99 Tech Park', 'Bangalore', 'Karnataka', '560001', '10SMART789C3D2');
            
            RAISE NOTICE 'Successfully created 7 sample parties for better data consistency.';
        END IF;
    END IF;
END $$;
