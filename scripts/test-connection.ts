// Test Supabase connection
// Run with: npx tsx scripts/test-connection.ts

import { createClient } from '@supabase/supabase-js';

// Manually set environment variables (load from .env.local)
const SUPABASE_URL = 'https://ahzalqvkkztgosocbcoz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFoemFscXZra3p0Z29zb2NiY296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcwMDczNDYsImV4cCI6MjA1MjU4MzM0Nn0.sb_publishable_MOOQ0aLBiPsR_TqF1Quumg_vOeOexzu';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testConnection() {
    console.log('🔍 Testing Supabase connection...\n');

    // Check connection
    console.log('Database URL:', SUPABASE_URL);
    console.log('');

    try {
        // Test database connection
        console.log('📊 Querying institutions table...');
        const { data, error, count } = await supabase
            .from('institutions')
            .select('*', { count: 'exact', head: true });

        if (error) {
            console.error('❌ Database query failed:', error.message);
            console.error('Error details:', error);
            process.exit(1);
        }

        console.log('✅ Connection successful!');
        console.log(`📈 Total institutions in database: ${count || 0}`);

        // Test programs table
        const { count: programsCount } = await supabase
            .from('programs')
            .select('*', { count: 'exact', head: true });

        console.log(`📚 Total programs in database: ${programsCount || 0}`);

        // Test ingest_jobs table
        const { count: jobsCount } = await supabase
            .from('ingest_jobs')
            .select('*', { count: 'exact', head: true });

        console.log(`⚙️  Total ingest jobs: ${jobsCount || 0}`);

        console.log('\n🎉 Database is ready!');
        console.log('\n✅ Phase 1 Complete - You can now start Phase 3: PDF Parsing');

    } catch (err: any) {
        console.error('❌ Connection test failed:', err.message);
        process.exit(1);
    }
}

testConnection();
