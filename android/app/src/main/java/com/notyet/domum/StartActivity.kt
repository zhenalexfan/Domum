package com.notyet.domum

import android.support.v7.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.View
import kotlinx.android.synthetic.main.activity_start.*
import android.widget.AdapterView



class StartActivity : AppCompatActivity() {

    var selectedRoom : Int = 1

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_start)
        room_selector.setOnItemSelectedListener(object : AdapterView.OnItemSelectedListener {
            override fun onNothingSelected(parent: AdapterView<*>?) {
            }

            override fun onItemSelected(parent: AdapterView<*>?, view: View?, position: Int, id: Long) {
                selectedRoom = position + 1
                Log.d(TAG, "selected ${selectedRoom}")
            }
        })
        action_confirm.setOnClickListener { MainActivity.actionStart(baseContext, selectedRoom)}
    }

    companion object {
        val TAG = "StartActivity"
    }
}
