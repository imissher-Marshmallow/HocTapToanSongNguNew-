(async () => {
  console.log('🔧 TESTING SUPABASE RLS');
  console.log('='.repeat(60));
  
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      'https://wjsjuwyefcscvttuidhr.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indqc2p1d3llZmNzY3Z0dHVpZGhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NTE5NzUsImV4cCI6MjA3ODQyNzk3NX0.pAQ55QYFKk8yTML4L_h3c_nWKmZT6BVJ7lemfUU0IBk'
    );
    
    console.log('\n🧪 Testing insert to Supabase...');
    
    const testData = {
      user_id: 'verify-test-' + Date.now(),
      quiz_id: 'main-quiz-test',
      overall_score: 85,
      correct_answers: 17,
      total_questions: 20,
      time_spent_seconds: 360,
      topic_performance: JSON.stringify({ Algebra: { score: 90 }, Geometry: { score: 80 } }),
      cognitive_breakdown: JSON.stringify({ understanding: 85, analysis: 80 }),
      answer_details: JSON.stringify([{ q: 1, a: true }, { q: 2, a: false }]),
      created_at: new Date().toISOString()
    };
    
    console.log('   User ID:', testData.user_id);
    console.log('   Score:', testData.overall_score + '/100');
    console.log('   Correct:', testData.correct_answers + '/' + testData.total_questions);
    
    const { data, error } = await supabase
      .from('quiz_results')
      .insert([testData])
      .select();
    
    if (error) {
      console.error('\n❌ INSERT FAILED:');
      console.error('   Error:', error.message);
      console.error('   Code:', error.code);
      console.error('\n⚠️  RLS Policy needs to be fixed in Supabase Dashboard!');
      console.error('\nFIX STEPS:');
      console.error('1. Go to https://app.supabase.com');
      console.error('2. Select your project');
      console.error('3. Go to SQL Editor');
      console.error('4. Click "New Query"');
      console.error('5. Copy-paste content from SUPABASE_RLS_FIX.sql');
      console.error('6. Click "Run"');
    } else {
      console.log('\n✅ INSERT SUCCESSFUL!');
      console.log('   Record ID:', data[0]?.id);
      console.log('   Supabase is accepting quiz submissions!');
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (e) {
    console.error('❌ Error:', e.message);
  }
  
  process.exit(0);
})();
