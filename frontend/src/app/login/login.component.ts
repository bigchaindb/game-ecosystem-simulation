import { Component, OnInit } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';

import { BdbService } from '../bdb.service'

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  public isBusy = false

  constructor(private router: Router, private bdbService: BdbService) { }

  onSubmit(f: NgForm) {
    this.isBusy = true

    let keypair = this.bdbService.getKeypairFromSeed(f.value.passPhrase)

    localStorage.setItem('user', JSON.stringify({
      publicKey:keypair.publicKey,
      privateKey:keypair.privateKey
    }))
    this.isBusy = false
    this.router.navigate([`/game`])
  }

  ngOnInit() {
  }

}
